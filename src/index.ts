import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { hostedLayers } from "./hosted-layers";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";

type RemotionLambdaConfig = {
  /**
   * The path to the Remotion site.
   */
  path: string;
  /**
   * Bundle command to run. You can specify the entrypoint, config, public dir and out dir with this.
   * @see https://www.remotion.dev/docs/cli/bundle
   * @default "npx remotion bundle"
   */
  bundleCommand?: string;
  /**
   * Whether to force destroy the bucket when deleting the stack. default: false
   *
   * @default false
   */
  forceDestroy?: boolean;
  /**
   * The amount of ephemeral storage to allocate for the function. default: 2048
   *
   * @default 2048
   */
  ephemerealStorageInMb?: number;
  /**
   * The timeout for the function. default: 120
   *
   * @default 120
   */
  timeoutInSeconds?: number;
  /**
   * The memory size for the function. default: 2048
   *
   * @default 2048
   */
  memorySizeInMb?: number;
  
  /**
   * The path to the lambda zip file.
   *
   * @default (remotionlambda-arm64.zip in node_modules/@remotion/lambda)
   *
   */
  lambdaZipPath?: string;
};

/**
 * A SST/Pulumi component that deploys Remotion lambda function to AWS.
 *
 * @example
 * ```ts
 * import { RemotionLambda } from "remotion-sst";
 *
 * const remotion = new RemotionLambda("Remotion", { path: "packages/remotion" });
 *
 * new Astro("Client", { path: "packages/client", link: [remotion]})
 * ```
 */
export class RemotionLambda extends pulumi.ComponentResource {
  public bucket: aws.s3.Bucket;
  public function: aws.lambda.Function;
  public siteUrl: pulumi.Output<string>;
  public permissions: { actions: string[]; resources: pulumi.Input<string>[] }[];

  private bucketOwnershipControls: aws.s3.BucketOwnershipControls;
  private bucketPublicAccessBlock: aws.s3.BucketPublicAccessBlock;
  private bucketLifecycleConfigV2: aws.s3.BucketLifecycleConfigurationV2;
  private bucketAclV2: aws.s3.BucketAclV2;

  constructor(name: string, args: RemotionLambdaConfig, opts?: pulumi.ComponentResourceOptions) {
    super("pkg:index:RemotionLambda", name, args, opts);

    this.createBucket(name, args);
    this.uploadSiteContent(name, args.path, args.bundleCommand);
    this.createLambdaFunction(name, args);
    this.definePermissions();
    this.siteUrl = pulumi.interpolate`https://${this.bucket.bucket}.s3.${this.bucket.region}.amazonaws.com/index.html`;
  }

  private createBucket(name: string, args: RemotionLambdaConfig) {
    this.bucket = new aws.s3.Bucket(
      `${name}Bucket`,
      { forceDestroy: args.forceDestroy, website: { indexDocument: "index.html" } },
      { parent: this },
    );

    this.bucketOwnershipControls = new aws.s3.BucketOwnershipControls(
      `${name}BucketOwnershipControls`,
      {
        bucket: this.bucket.id,
        rule: { objectOwnership: "BucketOwnerPreferred" },
      },
      { parent: this, dependsOn: [this.bucket] },
    );

    this.bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}BucketPublicAccessBlock`,
      {
        bucket: this.bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { parent: this, dependsOn: [this.bucket, this.bucketOwnershipControls] },
    );

    this.bucketAclV2 = new aws.s3.BucketAclV2(
      `${name}BucketAclV2`,
      { bucket: this.bucket.id, acl: "public-read" },
      {
        parent: this,
        dependsOn: [this.bucket, this.bucketOwnershipControls, this.bucketPublicAccessBlock],
      },
    );

    const getDeleteAfterFilter = (days: number) => ({
      id: `DELETE_AFTER_${days}_DAYS`,
      filter: { prefix: `renders/${days}-day` },
      status: "Enabled",
      expiration: { days },
    });

    this.bucketLifecycleConfigV2 = new aws.s3.BucketLifecycleConfigurationV2(
      `${name}LifecycleConfigV2`,
      {
        bucket: this.bucket.id,
        rules: [
          getDeleteAfterFilter(1),
          getDeleteAfterFilter(3),
          getDeleteAfterFilter(7),
          getDeleteAfterFilter(30),
        ],
      },
      { parent: this, dependsOn: [this.bucket] },
    );
  }

  private uploadSiteContent(name: string, sitePath: string, bundleCommand?: string) {
    const resolvedPath = path.join(process.cwd(), sitePath);
    execSync(`cd ${resolvedPath} && ${bundleCommand || "npx remotion bundle"}`);

    const files = fs
      .readdirSync(`${resolvedPath}/build`, { withFileTypes: true, recursive: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => ({
        path: `${dirent.path}/${dirent.name}`,
        key: `${dirent.path}/${dirent.name}`.replace(`${resolvedPath}/build/`, ""),
      }));

    files.forEach((file, i) => {
      new aws.s3.BucketObject(
        `${name}File${i}`,
        {
          bucket: this.bucket.bucket,
          source: new pulumi.asset.FileAsset(file.path),
          key: file.key,
          acl: "public-read",
          contentType: this.getContentType(file.key),
        },
        {
          parent: this,
          dependsOn: [
            this.bucket,
            this.bucketOwnershipControls,
            this.bucketPublicAccessBlock,
            this.bucketLifecycleConfigV2,
            this.bucketAclV2,
          ],
        },
      );
    });
  }

  private getContentType(fileName: string) {
    if (fileName.endsWith(".html")) return "text/html";
    if (fileName.endsWith(".css")) return "text/css";
    if (fileName.endsWith(".js")) return "application/javascript";
    return "application/octet-stream";
  }

  private createLambdaFunction(name: string, args: RemotionLambdaConfig) {
    const role = new aws.iam.Role(
      `${name}Role`,
      {
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "lambda.amazonaws.com" },
              Action: "sts:AssumeRole",
            },
          ],
        }),
      },
      { parent: this },
    );

    const zipPath = args.lambdaZipPath || path.join(
      process.cwd(),
      "node_modules",
      "@remotion/lambda",
      "remotionlambda-arm64.zip",
    );
    this.function = new aws.lambda.Function(
      `${name}Function`,
      {
        role: role.arn,
        runtime: "nodejs18.x",
        handler: "index.handler",
        architectures: ["arm64"],
        code: new pulumi.asset.FileArchive(zipPath),
        description: "Renders a Remotion video",
        timeout: args.timeoutInSeconds || 120,
        memorySize: args.memorySizeInMb || 2048,
        layers: aws
          .getRegion()
          .then((region) =>
            hostedLayers[region.id].map(({ layerArn, version }) => `${layerArn}:${version}`),
          ),
        ephemeralStorage: { size: args.ephemerealStorageInMb || 2048 },
      },
      { parent: this },
    );

    const policy = new aws.iam.Policy(
      `${name}Policy`,
      {
        policy: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["s3:*"],
              Resource: [pulumi.interpolate`${this.bucket.arn}/*`],
              Effect: "Allow",
            },
            {
              Action: ["lambda:*"],
              Resource: [this.function.arn],
              Effect: "Allow",
            },
            {
              Effect: "Allow",
              Action: ["logs:CreateLogGroup"],
              Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda-insights"],
            },
            {
              Effect: "Allow",
              Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
              Resource: [
                pulumi.interpolate`arn:aws:logs:*:*:log-group:/aws/lambda/${this.function.name}`,
                "arn:aws:logs:*:*:log-group:/aws/lambda-insights:*",
              ],
            },
          ],
        },
      },
      { parent: this },
    );
    new aws.iam.PolicyAttachment(
      name + "RolePolicyAttachment",
      { policyArn: policy.arn, roles: [role.name] },
      { parent: this },
    );
  }

  private definePermissions() {
    this.permissions = [
      {
        actions: ["s3:*"],
        resources: [pulumi.interpolate`${this.bucket.arn}/*`],
      },
      {
        actions: ["lambda:*"],
        resources: [this.function.arn],
      },
      {
        actions: ["logs:*"],
        resources: [
          pulumi.interpolate`arn:aws:logs:*:*:log-group:/aws/lambda/${this.function.name}`,
        ],
      },
    ];
  }

  getSSTLink() {
    return {
      properties: {
        functionName: this.function.name,
        bucketName: this.bucket.bucket,
        siteUrl: this.siteUrl,
        region: aws.getRegion().then((region) => region.id),
      },
    };
  }

  getSSTAWSPermissions() {
    return this.permissions;
  }
}
