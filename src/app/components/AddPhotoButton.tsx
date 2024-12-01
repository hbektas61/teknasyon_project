import React, { useState } from "react";

interface AddPhotoButtonProps {
    onImageSelect: (file: File) => void;
}

const AddPhotoButton: React.FC<AddPhotoButtonProps> = ({ onImageSelect }) => {
    const [showModal, setShowModal] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validExtensions = ["image/png", "image/jpeg", "image/jpg"];
            if (validExtensions.includes(file.type)) {
                onImageSelect(file);
            } else {
                setShowModal(true);
            }
        }
    };

    return (
        <>
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white rounded-lg p-6 w-80">
                        <h2 className="text-xl font-bold mb-4">Geçersiz Dosya Formatı</h2>
                        <p className="text-gray-700 mb-4">
                            Lütfen sadece <strong>PNG, JPEG veya JPG</strong> formatında dosya yükleyin.
                        </p>
                        <button
                            onClick={() => setShowModal(false)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-300"
                        >
                            Tamam.
                        </button>
                    </div>
                </div>
            )}

            <label
                htmlFor="file-input"
                className="px-6 py-3 bg-black text-white rounded-lg cursor-pointer hover:bg-gray-800 transition duration-300"
            >
                Add Photo
                <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </label>
        </>
    );
};

export default AddPhotoButton;