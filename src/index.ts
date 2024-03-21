import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { hostedLayers } from "./hosted-layers";

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

    this.bucket = new aws.s3.Bucket(name + "Bucket", { acl: "private" }, { parent: this });

    // new aws.s3.BucketPolicy(
    //   name + "BucketPolicy",
    //   {
    //     bucket: this.bucket.bucket,
    //     policy: {
    //       Version: "2012-10-17",
    //       Statement: [
    //         {
    //           Effect: "Allow",
    //           Principal: "*",
    //           Action: ["s3:GetObject"],
    //           Resource: this.bucket.arn.apply((arn) => [`${arn}/*`]),
    //         },
    //       ],
    //     },
    //   },
    //   { parent: this }
    // );

    // const bucketObject = new aws.s3.BucketObject(
    //   "my-bucket-object",
    //   {
    //     bucket: this.bucket.bucket,
    //     source: new pulumi.asset.FileArchive(args.site.bundlePath),
    //     acl: "public-read",
    //     key: "/site/index.html",
    //   },
    //   { parent: this }
    // );

    this.registerOutputs({});
  }
}
