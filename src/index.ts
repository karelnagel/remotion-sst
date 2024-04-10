import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { hostedLayers } from "./hosted-layers";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
export { permissions } from "./permissions";

type RemotionLambdaConfig = {
  path: string;
  function: {
    ephemerealStorageInMb: number;
    timeoutInSeconds: number;
    memorySizeInMb: number;
  };
};

export class RemotionLambda extends pulumi.ComponentResource {
  public bucket: aws.s3.Bucket;
  public function: aws.lambda.Function;
  public siteUrl: pulumi.Output<string>;

  constructor(name: string, args: RemotionLambdaConfig, opts?: pulumi.ComponentResourceOptions) {
    super("pkg:index:RemotionLambda", name, args, opts);

    const policy = new aws.iam.Policy(
      name + "Policy",
      {
        name: "remotion-lambda-policy",
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
              Resource: ["arn:aws:s3:::remotionlambda-*"],
            },
            {
              Sid: "2",
              Effect: "Allow",
              Action: ["lambda:InvokeFunction"],
              Resource: ["arn:aws:lambda:*:*:function:remotion-render-*"],
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
              Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*", "arn:aws:logs:*:*:log-group:/aws/lambda-insights:*"],
            },
          ],
        },
      },
      { parent: this }
    );

    const role = new aws.iam.Role(
      name + "Role",
      {
        name: "remotion-lambda-role",
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

    new aws.iam.PolicyAttachment(
      name + "RolePolicyAttachment",
      {
        policyArn: policy.arn,
        roles: [role.name],
      },
      { parent: this }
    );

    const LAMBDA_VERSION_STRING = "4.0.126".replace(/\./g, "-").replace(/\+/g, "-").substring(0, 10);
    const fnNameRender = [
      `remotion-render-${LAMBDA_VERSION_STRING}`,
      `mem${args.function.memorySizeInMb}mb`,
      `disk${args.function.ephemerealStorageInMb}mb`,
      `${args.function.timeoutInSeconds}sec`,
    ].join("-");
    const zipPath = path.join(process.cwd(), "node_modules", "@remotion/lambda", "remotionlambda-arm64.zip");
    this.function = new aws.lambda.Function(
      name + "Function",
      {
        name: fnNameRender,
        role: role.arn,
        runtime: "nodejs18.x",
        architectures: ["arm64"],
        code: new pulumi.asset.FileArchive(zipPath),
        description: "Renders a Remotion video",
        timeout: args.function.timeoutInSeconds,
        memorySize: args.function.memorySizeInMb,
        handler: "index.handler",
        layers: aws.getRegion().then((region) => hostedLayers[region.id].map(({ layerArn, version }) => `${layerArn}:${version}`)),
        ephemeralStorage: {
          size: args.function.ephemerealStorageInMb,
        },
      },
      { parent: this }
    );

    this.bucket = new aws.s3.Bucket(
      name + "Bucket",
      {
        bucket: "remotionlambda-2" + name.toLowerCase(),
      },
      { parent: this }
    );

    new aws.s3.BucketPublicAccessBlock(
      name + "BucketPublicAccessBlock",
      {
        bucket: this.bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { parent: this }
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
      { parent: this }
    );
    const sitePath = path.join(process.cwd(), args.path);
    execSync(`cd ${sitePath} && npx remotion bundle`);

    const bundlePath = `${sitePath}/build`;
    const files = fs.readdirSync(bundlePath);
    console.log(files);
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
        { parent: this }
      );
    }
    this.siteUrl = pulumi.interpolate`https://${this.bucket.bucket}.s3.${this.bucket.region}.amazonaws.com/index.html`;

    this.registerOutputs({});
  }
}
