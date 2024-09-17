import useDrivePicker from 'react-google-drive-picker'

function GooglePicker() {
  const [openPicker, authResponse] = useDrivePicker()
  const handleOpenPicker = () => {
    openPicker({
      clientId: '844820840925-vat08ahnb47t8hldmr2qcmh7c8doqktn.apps.googleusercontent.com',
      developerKey: 'AIzaSyDOkE42B51UaVAMxyMyG-Z2ZJraXHsRxNw',
      viewId: 'DOCS',
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: true,
      callbackFunction: (data) => {
        if (data.action === 'cancel') {
          console.log('User clicked cancel/close button')
        }
        console.log(data)
      },
    })
  }
  console.log(authResponse)
  return (
    <div>
      <button onClick={() => handleOpenPicker()}>Open Picker</button>
    </div>
  )
}

export default GooglePicker
