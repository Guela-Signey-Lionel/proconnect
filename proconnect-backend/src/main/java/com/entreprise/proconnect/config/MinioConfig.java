package com.entreprise.proconnect.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** S3-compatible object storage client (Amazon S3 in production, MinIO in dev) — section 19. */
@Configuration
public class MinioConfig {

    @Value("${proconnect.storage.endpoint}")
    private String endpoint;

    @Value("${proconnect.storage.access-key}")
    private String accessKey;

    @Value("${proconnect.storage.secret-key}")
    private String secretKey;

    @Value("${proconnect.storage.bucket}")
    private String bucket;

    @Bean
    public MinioClient minioClient() {
        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        ensureBucketExists(client);
        return client;
    }

    private void ensureBucketExists(MinioClient client) {
        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
            // Les fichiers (avatars, pièces jointes, stories…) sont lus directement
            // par le navigateur via leur URL : le bucket doit être lisible publiquement.
            String policy = """
                    {
                      \"Version\": \"2012-10-17\",
                      \"Statement\": [{
                        \"Effect\": \"Allow\",
                        \"Principal\": {\"AWS\": [\"*\"]},
                        \"Action\": [\"s3:GetObject\"],
                        \"Resource\": [\"arn:aws:s3:::%s/*\"]
                      }]
                    }
                    """.formatted(bucket);
            client.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucket).config(policy).build());
        } catch (Exception ex) {
            // Storage may not be reachable yet at startup in some environments (e.g. tests) —
            // upload calls will surface a clear error later rather than failing the boot here.
        }
    }
}
