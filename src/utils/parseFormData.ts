import { IncomingForm, Fields, Files } from 'formidable'
import { NextApiRequest } from 'next'

export const parseFormData = async (
  req: NextApiRequest,
): Promise<{ fields: Fields; files: Files }> =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true })
    form.parse(req, (err: string, fields: Fields, files: Files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
})
