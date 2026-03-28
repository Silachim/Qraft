import { useState, useEffect, useRef } from "react";
import { QrCode, Link, MessageSquare, User, Download, Copy, Check, FileText, Upload, X } from "lucide-react";

const QRCodeGenerator = () => {
  const [activeTab, setActiveTab] = useState("url");
  const [qrData, setQrData] = useState("");
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef(null);

  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [contactInfo, setContactInfo] = useState({ firstName: "", lastName: "", phone: "", email: "", organization: "", url: "" });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const loadQRious = () =>
    new Promise((resolve) => {
      if (window.QRious) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
      s.onload = resolve;
      document.head.appendChild(s);
    });

  const renderQR = async (text) => {
    if (!text || !qrContainerRef.current) {
      if (qrContainerRef.current) qrContainerRef.current.innerHTML = "";
      return;
    }
    await loadQRious();
    qrContainerRef.current.innerHTML = "";
    const canvas = document.createElement("canvas");
    qrContainerRef.current.appendChild(canvas);
    new window.QRious({ element: canvas, value: text, size: 280, background: "white", foreground: "black", level: "H" });
    canvas.style.maxWidth = "280px";
    canvas.style.height = "auto";
    canvas.style.borderRadius = "12px";
  };

  useEffect(() => {
    let data = "";
    if (activeTab === "url") data = urlInput.trim() ? (urlInput.startsWith("http") ? urlInput : "https://" + urlInput) : "";
    else if (activeTab === "text") data = textInput;
    else if (activeTab === "contact" && (contactInfo.firstName || contactInfo.lastName || contactInfo.phone || contactInfo.email))
      data = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactInfo.firstName} ${contactInfo.lastName}\nN:${contactInfo.lastName};${contactInfo.firstName};;;\nORG:${contactInfo.organization}\nTEL:${contactInfo.phone}\nEMAIL:${contactInfo.email}\nURL:${contactInfo.url}\nEND:VCARD`;
    else if (activeTab === "file") data = fileDataUrl;
    setQrData(data);
    renderQR(data);
  }, [activeTab, urlInput, textInput, contactInfo, fileDataUrl]);

  const processFile = (file) => {
    setFileError("");
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      setFileError("Only PDF and Word (.doc/.docx) files are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 2MB for QR encoding.");
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFileDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const removeFile = () => { setUploadedFile(null); setFileDataUrl(""); setFileError(""); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const downloadQR = () => {
    const canvas = qrContainerRef.current?.querySelector("canvas");
    if (canvas) { const a = document.createElement("a"); a.download = `qr-code-${activeTab}.png`; a.href = canvas.toDataURL(); a.click(); }
  };

  const copyData = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setUrlInput(""); setTextInput(""); setContactInfo({ firstName: "", lastName: "", phone: "", email: "", organization: "", url: "" });
    removeFile(); setQrData("");
    if (qrContainerRef.current) qrContainerRef.current.innerHTML = "";
  };

  const tabs = [
    { id: "url", label: "URL", icon: Link },
    { id: "text", label: "Text", icon: MessageSquare },
    { id: "contact", label: "Contact", icon: User },
    { id: "file", label: "File", icon: FileText },
  ];

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200";
  const labelCls = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">QRaft</h1>
          <p className="text-gray-600 text-lg">Craft QR codes for URLs, text, contacts, and documents</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 ${activeTab === id ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Inputs */}
              <div className="space-y-5">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {activeTab === "url" && "Enter URL"}
                  {activeTab === "text" && "Enter Text"}
                  {activeTab === "contact" && "Contact Information"}
                  {activeTab === "file" && "Upload Document"}
                </h2>

                {activeTab === "url" && (
                  <div>
                    <label className={labelCls}>Website URL</label>
                    <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="example.com or https://example.com" className={inputCls} />
                    <p className="text-xs text-gray-500 mt-1">https:// will be added automatically if omitted.</p>
                  </div>
                )}

                {activeTab === "text" && (
                  <div>
                    <label className={labelCls}>Text Content</label>
                    <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Enter any text to generate a QR code..." rows={5} className={inputCls + " resize-none"} />
                  </div>
                )}

                {activeTab === "contact" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>First Name</label><input type="text" value={contactInfo.firstName} onChange={e => setContactInfo({ ...contactInfo, firstName: e.target.value })} placeholder="John" className={inputCls} /></div>
                      <div><label className={labelCls}>Last Name</label><input type="text" value={contactInfo.lastName} onChange={e => setContactInfo({ ...contactInfo, lastName: e.target.value })} placeholder="Doe" className={inputCls} /></div>
                    </div>
                    <div><label className={labelCls}>Phone</label><input type="tel" value={contactInfo.phone} onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })} placeholder="+1 (555) 123-4567" className={inputCls} /></div>
                    <div><label className={labelCls}>Email</label><input type="email" value={contactInfo.email} onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })} placeholder="john@example.com" className={inputCls} /></div>
                    <div><label className={labelCls}>Organization</label><input type="text" value={contactInfo.organization} onChange={e => setContactInfo({ ...contactInfo, organization: e.target.value })} placeholder="Company Name" className={inputCls} /></div>
                    <div><label className={labelCls}>Website</label><input type="url" value={contactInfo.url} onChange={e => setContactInfo({ ...contactInfo, url: e.target.value })} placeholder="https://example.com" className={inputCls} /></div>
                  </div>
                )}

                {activeTab === "file" && (
                  <div className="space-y-4">
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => !uploadedFile && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${isDragging ? "border-purple-500 bg-purple-50" : uploadedFile ? "border-green-400 bg-green-50 cursor-default" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"}`}>
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                      {uploadedFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm truncate max-w-[180px]">{uploadedFile.name}</p>
                              <p className="text-xs text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); removeFile(); }} className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="font-medium text-gray-700">Drop your file here or click to browse</p>
                          <p className="text-sm text-gray-500 mt-1">Supports PDF, DOC, DOCX — max 2MB</p>
                        </>
                      )}
                    </div>

                    {fileError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-start gap-2">
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0" />{fileError}
                      </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                      <strong>Note:</strong> The file is encoded directly into the QR code as a data URL. Keep files small (under 2MB) for reliable scanning. For large files, consider uploading to cloud storage and using the URL tab instead.
                    </div>
                  </div>
                )}

                <button onClick={resetForm} className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium">
                  Clear All Fields
                </button>
              </div>

              {/* Right: QR Display */}
              <div className="flex flex-col items-center space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">Generated QR Code</h2>
                <div className="bg-gray-50 rounded-2xl p-8 w-full max-w-sm flex items-center justify-center min-h-[300px]">
                  {qrData ? (
                    <div className="text-center">
                      <div ref={qrContainerRef} className="flex justify-center" />
                      <p className="text-sm text-gray-500 mt-4">Scan with your device camera</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Fill in the form to generate your QR code</p>
                    </div>
                  )}
                </div>

                {qrData && (
                  <div className="flex gap-3 w-full max-w-sm">
                    <button onClick={downloadQR} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
                      <Download className="w-4 h-4" />Download
                    </button>
                    <button onClick={copyData} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium">
                      {copied ? <><Check className="w-4 h-4 text-green-600" />Copied!</> : <><Copy className="w-4 h-4" />Copy Data</>}
                    </button>
                  </div>
                )}

                {qrData && activeTab !== "file" && (
                  <div className="w-full max-w-sm">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code Data:</h3>
                    <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600 max-h-28 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">{qrData}</pre>
                    </div>
                  </div>
                )}
                {qrData && activeTab === "file" && (
                  <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                    ✓ File encoded successfully. The QR code contains the full file data.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-500 text-sm">QRaft • Craft QR codes instantly • No data stored • Free to use</p>
      </div>
    </div>
  );
};

export default QRCodeGenerator;