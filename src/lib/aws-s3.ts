
import type { S3 } from 'aws-sdk';

export const uploadFileToS3 = async (file: File, folder: string): Promise<string> => {
  const S3 = (await import('aws-sdk')).S3;
  
  const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_AWS_REGION;
  const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

  if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS S3 credentials or configuration are missing from environment variables.');
  }

  const s3 = new S3({
    accessKeyId,
    secretAccessKey,
    region,
  });

  const params: S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: `${folder}/${Date.now()}_${file.name}`,
    Body: file,
    ContentType: file.type,
  };

  try {
    const data = await s3.upload(params).promise();
    return data.Location; // Returns the URL of the uploaded file
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
    const S3 = (await import('aws-sdk')).S3;
  
    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
    const region = process.env.NEXT_PUBLIC_AWS_REGION;
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
  
    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 credentials or configuration are missing from environment variables.');
    }
  
    const s3 = new S3({
      accessKeyId,
      secretAccessKey,
      region,
    });

    try {
        const url = new URL(fileUrl);
        const key = decodeURIComponent(url.pathname.substring(1)); // Remove leading '/'

        const params = {
            Bucket: bucketName,
            Key: key,
        };

        await s3.deleteObject(params).promise();
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        // We can choose to throw or handle this silently. For now, let's throw.
        throw new Error('Failed to delete file from S3.');
    }
};

    