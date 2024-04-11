import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { hostedLayers } from "./hosted-layers";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";

type RemotionLambdaConfig = {
  path: string;
  forceDestroy?: boolean;
  bundleCommand?: string;
  ephemerealStorageInMb?: number;
  timeoutInSeconds?: number;
  memorySizeInMb?: number;
};

export class RemotionLambda extends pulumi.ComponentResource {
  public bucket: aws.s3.Bucket;
  public function: aws.lambda.Function;
  public siteUrl: pulumi.Output<string>;
  public permissions: { actions: string[]; resources: pulumi.Input<string>[] }[];

  constructor(name: string, args: RemotionLambdaConfig, opts?: pulumi.ComponentResourceOptions) {
    super("pkg:index:RemotionLambda", name, args, opts);
    // Creating bucket
    this.bucket = new aws.s3.Bucket(name + "Bucket", { forceDestroy: args.forceDestroy }, { parent: this });

    new aws.s3.BucketPublicAccessBlock(
      name + "BucketPublicAccessBlock",
      {
        bucket: this.bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { parent: this, dependsOn: [this.bucket] }
    );
    new aws.s3.BucketPolicy(
      name + "BucketPolicy",
      {
        bucket: this.bucket.bucket,
        policy: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicReadGetObject",
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [pulumi.interpolate`${this.bucket.arn}/*`],
            },
          ],
        },
      },
      { parent: this, dependsOn: [this.bucket] }
    );

    // Bundling and uploading
    const sitePath = path.join(process.cwd(), args.path);
    const bundleCommand = args.bundleCommand || "npx remotion bundle";
    execSync(`cd ${sitePath} && ${bundleCommand}`);

    const bundlePath = `${sitePath}/build`;
    const files = fs.readdirSync(bundlePath);
    for (const [i, file] of files.entries()) {
      new aws.s3.BucketObject(
        name + "File" + i,
        {
          bucket: this.bucket.bucket,
          source: new pulumi.asset.FileAsset(bundlePath + "/" + file),
          key: file,
          contentType: file.endsWith(".html")
            ? "text/html"
            : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".js")
            ? "application/javascript"
            : "application/octet-stream",
        },
        { parent: this, dependsOn: [this.bucket] }
      );
    }

    // Creating function
    const role = new aws.iam.Role(
      name + "Role",
      {
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        }),
      },
      { parent: this }
    );

    const zipPath = path.join(process.cwd(), "node_modules", "@remotion/lambda", "remotionlambda-arm64.zip");
    this.function = new aws.lambda.Function(
      name + "Function",
      {
        role: role.arn,
        runtime: "nodejs18.x",
        handler: "index.handler",
        architectures: ["arm64"],
        code: new pulumi.asset.FileArchive(zipPath),
        description: "Renders a Remotion video",
        timeout: args.timeoutInSeconds || 120,
        memorySize: args.memorySizeInMb || 2048,
        layers: aws.getRegion().then((region) => hostedLayers[region.id].map(({ layerArn, version }) => `${layerArn}:${version}`)),
        ephemeralStorage: {
          size: args.ephemerealStorageInMb || 2048,
        },
      },
      { parent: this }
    );

    const policy = new aws.iam.Policy(
      name + "Policy",
      {
        policy: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "0",
              Effect: "Allow",
              Action: ["s3:ListAllMyBuckets"],
              Resource: ["*"],
            },
            {
              Sid: "1",
              Effect: "Allow",
              Action: [
                "s3:CreateBucket",
                "s3:ListBucket",
                "s3:PutBucketAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl",
                "s3:PutObject",
                "s3:GetBucketLocation",
              ],
              Resource: [pulumi.interpolate`${this.bucket.arn}*`],
            },
            {
              Sid: "2",
              Effect: "Allow",
              Action: ["lambda:InvokeFunction"],
              Resource: [this.function.arn],
            },
            {
              Sid: "3",
              Effect: "Allow",
              Action: ["logs:CreateLogGroup"],
              Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda-insights"],
            },
            {
              Sid: "4",
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
      { parent: this }
    );
    new aws.iam.PolicyAttachment(name + "RolePolicyAttachment", { policyArn: policy.arn, roles: [role.name] }, { parent: this });

    this.siteUrl = pulumi.interpolate`https://${this.bucket.bucket}.s3.${this.bucket.region}.amazonaws.com/index.html`;

    this.permissions = [
      {
        actions: [
          "servicequotas:GetServiceQuota",
          "servicequotas:GetAWSDefaultServiceQuota",
          "servicequotas:RequestServiceQuotaIncrease",
          "servicequotas:ListRequestedServiceQuotaChangeHistoryByQuota",
        ],
        resources: ["*"],
      },
      {
        actions: ["iam:SimulatePrincipalPolicy"],
        resources: ["*"],
      },
      {
        actions: ["iam:PassRole"],
        resources: [role.arn],
      },
      {
        actions: [
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl",
          "s3:PutObject",
          "s3:CreateBucket",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:PutBucketAcl",
          "s3:DeleteBucket",
          "s3:PutBucketOwnershipControls",
          "s3:PutBucketPublicAccessBlock",
          "s3:PutLifecycleConfiguration",
        ],
        resources: [pulumi.interpolate`${this.bucket.arn}/*`],
      },
      {
        actions: ["s3:ListAllMyBuckets"],
        resources: ["*"],
      },
      {
        actions: ["lambda:ListFunctions", "lambda:GetFunction"],
        resources: ["*"],
      },
      {
        actions: [
          "lambda:InvokeAsync",
          "lambda:InvokeFunction",
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:PutFunctionEventInvokeConfig",
          "lambda:PutRuntimeManagementConfig",
          "lambda:TagResource",
        ],
        resources: [this.function.arn],
      },
      {
        actions: ["logs:CreateLogGroup", "logs:PutRetentionPolicy"],
        resources: [pulumi.interpolate`arn:aws:logs:*:*:log-group:/aws/lambda/${this.function.name}`],
      },
      {
        actions: ["lambda:GetLayerVersion"],
        resources: ["arn:aws:lambda:*:678892195805:layer:remotion-binaries-*", "arn:aws:lambda:*:580247275435:layer:LambdaInsightsExtension*"],
      },
    ];

    this.registerOutputs({});
  }
  getSSTLink() {
    return {
      properties: {
        functionName: this.function.name,
        bucketName: this.bucket.bucket,
        siteUrl: this.siteUrl,
      },
    };
  }

  getSSTAWSPermissions() {
    return this.permissions;
  }
}
