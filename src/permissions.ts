export const permissions = [
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
    resources: ["arn:aws:iam::*:role/remotion-lambda-role"],
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
    resources: ["arn:aws:s3:::remotionlambda-*"],
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
    resources: ["arn:aws:lambda:*:*:function:remotion-render-*"],
  },
  {
    actions: ["logs:CreateLogGroup", "logs:PutRetentionPolicy"],
    resources: ["arn:aws:logs:*:*:log-group:/aws/lambda/remotion-render-*"],
  },
  {
    actions: ["lambda:GetLayerVersion"],
    resources: ["arn:aws:lambda:*:678892195805:layer:remotion-binaries-*", "arn:aws:lambda:*:580247275435:layer:LambdaInsightsExtension*"],
  },
];
