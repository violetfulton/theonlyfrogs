import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export async function uploadBlogImage(file, postSlug) {
  try {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const imagePath = `blog-images/${postSlug}/${filename}`;

    const imageRef = ref(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('✅ Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

export async function uploadMultipleImages(files, postSlug) {
  const uploadPromises = files.map(file => uploadBlogImage(file, postSlug));
  return await Promise.all(uploadPromises);
}