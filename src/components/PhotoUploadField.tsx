import React, { useState, useEffect } from "react";
import { Camera, X } from "lucide-react";
import styles from "./PhotoUploadField.module.css";
import clsx from "clsx";

interface PhotoUploadFieldProps {
  label: string;           // e.g. "Class Photo", "Owner Photo", "Class Logo", "Profile Photo"
  value: File | null;      // currently selected file
  existingUrl?: string;    // for edit forms — show existing photo
  onChange: (file: File | null) => void;
  disabled?: boolean;      // true during upload/submit
}

export default function PhotoUploadField({
  label,
  value,
  existingUrl,
  onChange,
  disabled = false,
}: PhotoUploadFieldProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setLocalPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setLocalPreview(objectUrl);

    // Clean up memory when component unmounts or value changes
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(null);
  };

  // Determine active preview source
  const previewSrc = localPreview || existingUrl;

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <label className={styles.label}>
          {label}
        </label>
        <span className={styles.optionalBadge}>
          Optional
        </span>
      </div>

      <div
        className={clsx(
          styles.dropzone,
          disabled && styles.disabled
        )}
      >
        {!previewSrc ? (
          <label className={styles.uploadTrigger}>
            <Camera
              size={20}
              className={styles.cameraIcon}
            />
            <span className={styles.triggerText}>
              Upload Image
            </span>
            <input
              type="file"
              className={styles.fileInput}
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled}
            />
          </label>
        ) : (
          <div className={clsx("animate-fade-in", styles.previewWrapper)}>
            <img
              src={previewSrc}
              alt={label}
              className={styles.previewImage}
            />
            <div className={styles.infoWrapper}>
              <span className={styles.fileName}>
                {value ? value.name : "Stored Photo"}
              </span>
              <span className={styles.fileSize}>
                {value
                  ? `${(value.size / 1024).toFixed(1)} KB`
                  : "Using existing URL"}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className={styles.removeButton}
                title="Remove photo"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
