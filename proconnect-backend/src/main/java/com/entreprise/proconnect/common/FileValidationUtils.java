package com.entreprise.proconnect.common;

import com.entreprise.proconnect.common.exception.BusinessRuleException;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

/** Equivalent to common/utils.py's validate_file_extension / validate_file_size on the Django side. */
public final class FileValidationUtils {

    private FileValidationUtils() {
    }

    public static void validateExtension(MultipartFile file, List<String> allowedExtensions) {
        String filename = file.getOriginalFilename();
        String extension = (filename != null && filename.contains("."))
                ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
                : "";
        if (!allowedExtensions.contains(extension)) {
            throw new BusinessRuleException(
                    "Extension '." + extension + "' non autorisée. Extensions acceptées : " + String.join(", ", allowedExtensions) + "."
            );
        }
    }

    public static void validateSize(MultipartFile file, int maxMb) {
        long maxBytes = (long) maxMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new BusinessRuleException("Fichier trop volumineux : " + maxMb + " Mo maximum.");
        }
    }

    /** Images only (avatars, couvertures…), 5 Mo maximum. */
    public static void validateImage(MultipartFile file) {
        validateExtension(file, List.of("jpg", "jpeg", "png", "gif", "webp"));
        validateSize(file, 5);
    }
}
