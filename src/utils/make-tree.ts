interface FileData {
  original_path: string
  user_id: string
  file_id: string
  file: File
}

export interface TreeNode {
  name: string
  user_id: string
  children: TreeNode[]
  file_id?: string
  file?: File
}

export const makeTree = (files: FileData[]): TreeNode => {
  const tree: TreeNode = { name: '', user_id: '', children: [] }
  const filesArray = Array.from(files)

  const addPath = (
    file: FileData,
    tree: TreeNode,
    user_id: string,
    file_id: string,
  ) => {
    if (file.original_path.endsWith('.DS_Store')) return
    const path = file.original_path

    const createChild = (
      name: string,
      user_id: string,
      file_id?: string,
      fileObj?: File,
    ): TreeNode => ({
      name,
      user_id,
      children: [],
      ...(file_id !== undefined && { file_id }),
      ...(fileObj !== undefined && { file: fileObj }),
    })
    const parts = path.split('/')
    if (!tree.name) {
      const otherFile = filesArray.find((f) => f.original_path !== path)
      const user_id = otherFile ? otherFile.user_id : undefined
      Object.assign(tree, createChild(parts[0], user_id || '', undefined))
    }

    parts.shift()
    let isLastChild = false
    parts.reduce((current, part, index) => {
      isLastChild = index === parts.length - 1
      const child = current.children.find((child) => child.name === part)

      if (child) {
        return child
      }

      const newChild = createChild(
        part,
        user_id,
        isLastChild ? file_id : undefined,
        isLastChild ? file.file : undefined,
      )
      current.children.push(newChild)
      return newChild
    }, tree)
  }

  filesArray.forEach((file) => addPath(file, tree, file.user_id, file.file_id))
  return tree
}
