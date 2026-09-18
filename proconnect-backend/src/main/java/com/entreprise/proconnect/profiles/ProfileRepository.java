package com.entreprise.proconnect.profiles;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByUserId(UUID userId);

    List<Profile> findByUserIdIn(Collection<UUID> userIds);

    @Query("""
            SELECT p FROM Profile p
            JOIN p.user u
            WHERE u.active = true
            AND (
                LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.jobTitle) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.department) LIKE LOWER(CONCAT('%', :search, '%'))
            )
            """)
    Page<Profile> search(@Param("search") String search, Pageable pageable);

    Page<Profile> findByUserActiveTrue(Pageable pageable);

    List<Profile> findByUserActiveTrue();
}
