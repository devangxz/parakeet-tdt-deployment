import axios from 'axios'

export const orderController = async (
  payload: { fileId: string; filename?: string; docType?: string },
  type: string
) =>
  actions[type as keyof typeof actions](
    payload as { fileId: string; filename?: string; docType?: string }
  )

// /file-pdf-signed-url
const downloadPDFFile = async ({
  fileId,
  docType,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.get(`/api/order/file-pdf-signed-url?fileId=${fileId}&docType=${docType}`, {
      responseType: 'blob'
    });
    const fileBlob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    return 'PDF file downloaded successfully';
  } catch (err) {
    console.error('Error downloading PDF file:', err);
    throw new Error('Failed to download PDF file');
  }
}

const downloadFile = async ({
  fileId,
  docType,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    if (docType === 'TRANSCRIPTION_DOC') {
      const response = await axios.get(`/api/order/file-docx-signed-url?fileId=${fileId}&docType=${docType}`, {
        responseType: 'blob'
      });
      const fileBlob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const downloadUrl = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${fileId}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      return 'DOCX file downloaded successfully';
    } else {
      const response = await axios.get(`/api/order/file-docx-signed-url?fileId=${fileId}&docType=${docType}`);
      const url = response?.data?.signedUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        console.error('No URL provided for download.');
        throw 'No URL provided for download.';
      }
      return response?.data?.message;
    }
  } catch (err) {
    throw new Error('Failed to download file');
  }
}

const downloadTxt = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.get(`/api/order/download-txt?fileId=${fileId}`, { responseType: 'blob' })
    const fileBlob = new Blob([response.data], { type: 'text/plain' });
    const downloadUrl = window.URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    return 'Txt file downloaded successfully'
  } catch (err) {
    console.error('Error downloading TXT file:', err);
    throw new Error('Failed to download TXT file');
  }
}

const deleteFile = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.post(`/api/files/delete`, {
      fileIds: [fileId],
    })
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const archiveFile = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.post(`/api/file/archive`, {
      fileIds: fileId,
    })
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const renameFile = async ({
  fileId,
  filename = 'newFile',
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.post(`/api/file/rename`, {
      fileId,
      filename,
    })
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const downloadSubtitle = async ({
  fileId,
  filename,
  docType,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const ext = docType?.toLowerCase()
    const response = await axios.get(
      `/api/order/download-subtitle?fileId=${fileId}&docType=${docType}`,
      {
        headers: {
          Accept: 'text/plain',
        },
        responseType: 'blob',
      }
    )
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'text/plain' })
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.${ext}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return `${docType} file downloaded Successfully`
  } catch (err) {
    throw err
  }
}
const rateFile = async ({
  fileId,
  filename,
  docType,
  rating,
}: {
  fileId: string
  filename?: string
  docType?: string
  rating?: number
}) => {
  try {
    const response = await axios.post(`/api/order/rating`, {
      fileId,
      filename,
      rating,
      docType,
    })
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const actions = {
  downloadFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadFile(payload),
  downloadPDFFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadPDFFile(payload),
  deleteFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => deleteFile(payload),
  archiveFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => archiveFile(payload),
  renameFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => renameFile(payload),
  downloadSubtitle: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadSubtitle(payload),
  rateFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
    rating?: number
  }) => rateFile(payload),
  downloadTxt: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadTxt(payload),
}
