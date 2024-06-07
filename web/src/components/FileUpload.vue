<script setup lang="ts">
import { onMounted, ref } from "vue";
import axios, { AxiosProgressEvent } from "axios";
import axiosService from "../services/axios-service";

const files = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const progress = ref<{ [key: string]: number }>({});
const errorMessage = ref("");
const uploading = ref(false);
const uploadedFiles = ref<Array<any>>([]);

const selectFiles = () => {
  if (fileInput.value && fileInput.value.files) {
    files.value = Array.from(fileInput.value.files);
  }
};

const fetchFiles = async () => {
  try {
    const response = await fetch("http://localhost:3000/files");
    if (response.ok) {
      const data = await response.json();
      uploadedFiles.value = data;
    } else {
      console.error("Failed to fetch files");
    }
  } catch (error) {
    console.error(error);
  }
};

const sendFiles = async () => {
  if (files.value.length === 0) {
    errorMessage.value = "You need to choose at least one file.";
    return;
  }

  for (const file of files.value) {
    if (!file.type.startsWith("image/")) {
      errorMessage.value =
        "Only image files (png, jpg, jpeg, gif) are allowed.";
      return;
    }

    if (file.size > 1000000) {
      errorMessage.value = `File ${file.name} is too large. Maximum file size is 1MB.`;
      return;
    }
  }

  uploading.value = true;
  errorMessage.value = "";

  const uploadPromises = files.value.map((file) => {
    const formData = new FormData();
    formData.append("file", file);

    return axiosService
      .post("/upload", formData, {
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (event.total) {
            progress.value[file.name] = Math.round(
              (event.loaded * 100) / event.total
            );
          }
        },
      })
      .then((response) => {
        console.log(
          response.data.message,
          "File Name: ",
          response.data.file.originalname
        );
        progress.value[file.name] = 100;
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response) {
          console.log("Error response:", err.response.data);
          errorMessage.value = err.response.data.message || "Upload failed";
        }
      });
  });

  try {
    await Promise.all(uploadPromises);
    fetchFiles();
  } finally {
    uploading.value = false;
    progress.value = {};
  }
};

const deleteFile = async (fileId: string) => {
  try {
    const response = await axiosService.delete(`/files/${fileId}`);
    if (response.status === 200) {
      fetchFiles();
    } else {
      console.error("Failed to delete file");
    }
  } catch (error) {
    console.error(error);
  }
};

const downloadFile = (fileId: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = `http://localhost:3000/files/download/${fileId}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  fetchFiles();
});
</script>

<template>
  <div class="whole-container">
    <form @submit.prevent="sendFiles" class="upload-form">
      <input
        :disabled="uploading"
        class="file-input"
        multiple
        accept="image/*"
        type="file"
        ref="fileInput"
        @change="selectFiles"
      />
      <button class="fileupload-btn" :disabled="uploading">Upload Files</button>
    </form>
    <div
      v-for="file in files"
      :key="file.name"
      class="progress-container"
      v-if="uploading"
    >
      <div class="progress-bar" :style="{ width: progress[file.name] + '%' }">
        {{ file.name }}
      </div>
    </div>
    <div class="error-message" v-if="errorMessage">
      {{ errorMessage }}
    </div>
    <div class="files-container" v-if="uploadedFiles.length">
      <h1>Uploaded Files</h1>
      <div class="file" v-for="file in uploadedFiles" :key="file._id">
        {{ file.originalname }}
        <div class="buttons">
          <button
            class="download-btn"
            @click="downloadFile(file._id, file.originalname)"
          >
            Download
          </button>
          <button class="delete-btn" @click="deleteFile(file._id)">X</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
h1 {
  background-color: #485696;
  border-radius: 5px;
  color: white;
}

.error-message {
  color: red;
  margin-top: 10px;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fileupload-btn {
  background-color: #485696;
  color: white;
  border: none;
  padding: 10px;
  cursor: pointer;
  border-radius: 5px;
}

.fileupload-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.buttons {
  background-color: #485696;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.download-btn {
  background-color: rgba(163, 191, 217, 0.704);
  border-radius: 50px;
  margin-left: 10px;
  border: none;
  cursor: pointer;
  color: white;
}

.delete-btn {
  background-color: rgba(163, 191, 217, 0.704);
  border-radius: 50px;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 15px;
}

.delete-btn:hover,
.download-btn:hover {
  background-color: rgba(255, 255, 255, 0.516);
}

.whole-container {
  border-radius: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  background-color: #39393a;
  max-width: 800px;
  margin: 0 auto;
}

.file-input {
  border: none;
  padding: 20px;
  background-color: #485696;
  color: white;
  border-radius: 10px;
  margin-top: 30px;
}

.file {
  border-radius: 5px;
  margin-top: 1px;
  background-color: #485696;
  color: white;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 70px;
}

.files-container {
  margin-top: 50px;
  background-color: #485696;
  border-radius: 20px;
  padding: 50px;
  margin-bottom: 50px;
}

.progress-container {
  width: 100%;
  background-color: #48569675;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 10px;
  text-align: center;
  color: white;
}

.progress-bar {
  height: 20px;
  background-color: #485696;
  transition: width 0.4s ease;
}
</style>
