package com.entreprise.proconnect.feed;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.io.InputStream;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Uploads files to an S3-compatible object store (Amazon S3 in production, MinIO in
 * development) — see cahier des charges section 19. Only metadata + URL are kept in
 * PostgreSQL; the binary content never touches the database.
 */
@Service
public class MediaStorageService {

    private final MinioClient minioClient;
    private final String bucket;
    private final String publicBaseUrl;

    public MediaStorageService(
            MinioClient minioClient,
            @Value("${proconnect.storage.bucket}") String bucket,
            @Value("${proconnect.storage.public-base-url}") String publicBaseUrl
    ) {
        this.minioClient = minioClient;
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl;
    }

    public String upload(MultipartFile file, String folder) {
        try {
            String objectName = folder + "/" + UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
            try (InputStream stream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucket)
                                .object(objectName)
                                .stream(stream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build()
                );
            }
            return publicBaseUrl + "/" + bucket + "/" + objectName;
        } catch (Exception ex) {
            throw new RuntimeException("Échec de l'envoi du fichier vers le stockage objet.", ex);
        }
    }

    private String sanitize(String filename) {
        if (filename == null) {
            return "fichier";
        }
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
