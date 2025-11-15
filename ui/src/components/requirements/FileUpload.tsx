import { useState, useRef, DragEvent } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  acceptedFileTypes?: string[];
  lang: 'ar' | 'en';
}

interface SelectedFile {
  file: File;
  id: string;
  error?: string;
}

const FileUpload = ({
  onFilesSelected,
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedFileTypes = ['.pdf', '.docx', '.xlsx', '.pptx'],
  lang
}: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizePerFile * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return lang === 'ar'
        ? `حجم الملف يتجاوز ${maxSizePerFile} ميجابايت`
        : `File size exceeds ${maxSizePerFile} MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return lang === 'ar'
        ? `نوع الملف غير مدعوم. الأنواع المقبولة: ${acceptedFileTypes.join(', ')}`
        : `File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    const fileArray = Array.from(files);

    // Check max files limit
    if (selectedFiles.length + fileArray.length > maxFiles) {
      toast.error(
        lang === 'ar'
          ? `يمكنك رفع ${maxFiles} ملفات كحد أقصى`
          : `Maximum ${maxFiles} files allowed`
      );
      return;
    }

    fileArray.forEach((file) => {
      const error = validateFile(file);
      newFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        error: error || undefined
      });

      if (error) {
        toast.error(error);
      }
    });

    setSelectedFiles([...selectedFiles, ...newFiles]);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(selectedFiles.filter(f => f.id !== id));
  };

  const handleUpload = () => {
    const validFiles = selectedFiles.filter(f => !f.error).map(f => f.file);
    if (validFiles.length === 0) {
      toast.error(lang === 'ar' ? 'لا توجد ملفات صالحة للرفع' : 'No valid files to upload');
      return;
    }

    onFilesSelected(validFiles);
    toast.success(
      lang === 'ar'
        ? `تم رفع ${validFiles.length} ملف بنجاح`
        : `${validFiles.length} file(s) uploaded successfully`
    );
    setSelectedFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <Upload className={`mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} size={48} />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {lang === 'ar' ? 'اسحب الملفات هنا أو انقر للاختيار' : 'Drag files here or click to select'}
        </p>
        <p className="text-sm text-gray-600">
          {lang === 'ar'
            ? `الأنواع المقبولة: ${acceptedFileTypes.join(', ')} • حجم أقصى: ${maxSizePerFile} ميجابايت • عدد أقصى: ${maxFiles} ملفات`
            : `Accepted: ${acceptedFileTypes.join(', ')} • Max size: ${maxSizePerFile} MB • Max files: ${maxFiles}`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            {lang === 'ar' ? 'الملفات المحددة' : 'Selected Files'} ({selectedFiles.length})
          </h4>
          {selectedFiles.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.error ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.error ? (
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                ) : (
                  <FileText className="text-blue-600 flex-shrink-0" size={20} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatFileSize(item.file.size)}
                  </p>
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeFile(item.id)}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition flex-shrink-0"
                title={lang === 'ar' ? 'إزالة' : 'Remove'}
              >
                <X size={18} />
              </button>
            </div>
          ))}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.every(f => f.error)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {lang === 'ar'
              ? `رفع ${selectedFiles.filter(f => !f.error).length} ملف`
              : `Upload ${selectedFiles.filter(f => !f.error).length} file(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
