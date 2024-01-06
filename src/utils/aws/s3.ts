import { DeleteObjectCommand, PutObjectCommand, GetObjectCommand, S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
const Bucket = process.env['BUCKET'];

export async function putObject(data: object | string, keyName: string) {
  const command = new PutObjectCommand({
    Bucket,
    Key: keyName,
    Body: typeof data === 'string' ? data : JSON.stringify(data)
  });

  return await s3.send(command);
}

export async function getObject<T>(path: string): Promise<T> {
  const command = new GetObjectCommand({
    Bucket,
    Key: path
  });

  const response = await s3.send(command);
  if(!response.Body) {
    throw new Error(`No object found at ${path}`);
  }

  return JSON.parse(await response.Body.transformToString()) as T;
}

export async function deleteObject(path: string) {
  const command = new DeleteObjectCommand({
    Bucket,
    Key: path
  });
  await s3.send(command);
}

export async function listObjects(pathPrefix: string, paginationToken?: string, limit = 100) {
  const command = new ListObjectsV2Command({
    Bucket,
    Prefix: pathPrefix,
    MaxKeys: limit,
    ContinuationToken: paginationToken
  });

  const result = await s3.send(command);

  return {
    objects: (result.Contents ?? []).map(x => ({
      path: x.Key ?? '',
      modifiedAt: x.LastModified ?? new Date(),
    })),
    paginationToken: result.ContinuationToken,
  };
}