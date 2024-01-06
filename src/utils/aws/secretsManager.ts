import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

/**
 * Retrieve a secret from AWS Secrets Manager
 * @param secretName 
 * @returns specified secret
 * @throws error if occurs, see below for possible exceptions thrown
 * {@link https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html}
 */
export async function getSecret(secretName: string): Promise<string | undefined> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );

    if (response.SecretString) {
      return JSON.parse(response.SecretString)[secretName];
    }
    return response.SecretString;
  } catch (error) {
    throw error;
  }
}