
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Deletes a user's entire account and associated data.
 * This function must be called by an authenticated user.
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const auth = admin.auth();

  try {
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // If the user doc doesn't exist, just delete the auth user.
      await auth.deleteUser(uid);
      return { success: true, message: "User auth record deleted." };
    }

    const userData = userDoc.data();
    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;

    // 1. Delete all user images from Amazon S3
    const imagesToDelete = [];
    if (userData.avatarUrl) {
      imagesToDelete.push(userData.avatarUrl);
    }
    if (userData.galleryImages && Array.isArray(userData.galleryImages)) {
      imagesToDelete.push(...userData.galleryImages);
    }

    for (const imageUrl of imagesToDelete) {
      try {
        const url = new URL(imageUrl);
        const key = decodeURIComponent(url.pathname.substring(1));
        const deleteParams = {
          Bucket: bucketName,
          Key: key,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error(`Failed to delete S3 object ${imageUrl}:`, s3Error);
        // We continue even if an image deletion fails.
      }
    }

    const batch = db.batch();

    // 2. Delete all posts by the user
    const postsQuery = db.collection("posts").where("author.uid", "==", uid);
    const postsSnapshot = await postsQuery.get();
    postsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Delete the user's profile document from Firestore
    batch.delete(userDocRef);

    // Commit all Firestore deletions
    await batch.commit();

    // 4. Delete the user from Firebase Authentication (this is the last step)
    await auth.deleteUser(uid);

    return { success: true, message: "Account deleted successfully." };
  } catch (error) {
    console.error("Error deleting user account for UID:", uid, error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while deleting the account.",
      error.message
    );
  }
});
