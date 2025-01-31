import { Upload } from "lucide-react"

export default function FileUpload() {
  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Upload Required Documents</h2>
      <p className="text-sm text-gray-600 mb-4">
        Please upload the following documents: Previous DS160, Passport, I767, Travel Ticket
      </p>
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF, PNG, JPG or GIF (MAX. 10MB)</p>
          </div>
          <input id="dropzone-file" type="file" className="hidden" multiple />
        </label>
      </div>
    </div>
  )
}

