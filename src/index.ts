import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { hostedLayers } from "./hosted-layers";
import fs from "fs";

type RemotionLambdaConfig = {
  function: {
    ephemerealStorageInMb: number;
    timeoutInSeconds: number;
    memorySizeInMb: number;
  };
  site: {
    bundlePath: string;
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
              Resource: ["arn:aws:s3:::*"],
            },
            {
              Sid: "2",
              Effect: "Allow",
              Action: ["lambda:InvokeFunction"],
              Resource: ["arn:aws:lambda:*:*:function:*"],
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
              Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda/*", "arn:aws:logs:*:*:log-group:/aws/lambda-insights:*"],
            },
          ],
        },
      },
      { parent: this }
    );

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

    new aws.iam.PolicyAttachment(
      name + "RolePolicyAttachment",
      {
        policyArn: policy.arn,
        roles: [role.name],
      },
      { parent: this }
    );

    const zip = "/Users/karel/Documents/pulumi-remotion-lambda/remotionlambda-arm64.zip";
    this.function = new aws.lambda.Function(
      name + "Function",
      {
        role: role.arn,
        runtime: "nodejs18.x",
        architectures: ["arm64"],
        code: new pulumi.asset.FileArchive(zip),
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

    this.bucket = new aws.s3.Bucket(name + "Bucket", {}, { parent: this });
    this.bucket.bucket.apply((x) => console.log(x));

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

    const files = fs.readdirSync(args.site.bundlePath);
    console.log(files);
    for (const [i, file] of files.entries()) {
      new aws.s3.BucketObject(
        name + "File" + i,
        {
          bucket: this.bucket.bucket,
          source: new pulumi.asset.FileAsset(args.site.bundlePath + "/" + file),
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
