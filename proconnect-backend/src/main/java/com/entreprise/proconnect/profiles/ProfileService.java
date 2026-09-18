package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.accounts.UserRepository;
import com.entreprise.proconnect.common.FileValidationUtils;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.MediaStorageService;
import com.entreprise.proconnect.profiles.dto.ProfileUpdateRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final MediaStorageService mediaStorageService;

    public ProfileService(
            ProfileRepository profileRepository,
            UserRepository userRepository,
            MediaStorageService mediaStorageService
    ) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.mediaStorageService = mediaStorageService;
    }

    @Transactional
    public Profile getOrCreate(User user) {
        return profileRepository.findByUserId(user.getId())
                .orElseGet(() -> profileRepository.save(Profile.builder().user(user).build()));
    }

    @Transactional(readOnly = true)
    public Profile getById(UUID id) {
        // open-in-view désactivé : les collections LAZY doivent être initialisées
        // dans la transaction, sinon LazyInitializationException à la sérialisation.
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profil introuvable."));
        initializeCollections(profile);
        return profile;
    }

    /** Profil complet de l'utilisateur (créé à la volée s'il n'existe pas encore). */
    @Transactional
    public Profile getDetailByUserId(UUID userId) {
        Profile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
                    return profileRepository.save(Profile.builder().user(user).build());
                });
        initializeCollections(profile);
        return profile;
    }

    /**
     * Initialise les collections une par une (un fetch multiples lèverait une
     * MultipleBagFetchException avec plusieurs List) — reste dans la transaction.
     */
    private void initializeCollections(Profile profile) {
        profile.getSkills().size();
        profile.getExperiences().size();
        profile.getEducation().size();
        profile.getCertifications().size();
    }

    public Page<Profile> search(String search, Pageable pageable) {
        if (search == null || search.isBlank()) {
            return profileRepository.findByUserActiveTrue(pageable);
        }
        return profileRepository.search(search, pageable);
    }

    /**
     * Répertoire complet : tous les profils des comptes actifs, sans pagination.
     * Sert aux listes locales (suggestions, invitations, réseau) : dès qu'un
     * compte est créé, il apparaît chez tous les autres utilisateurs.
     */
    @Transactional(readOnly = true)
    public List<Profile> directory() {
        List<Profile> profiles = profileRepository.findByUserActiveTrue();
        // Initialise le user de chaque profil dans la transaction (open-in-view désactivé).
        profiles.forEach(p -> p.getUser().getId());
        return profiles;
    }

    @Transactional
    public Profile update(UUID profileId, User requester, ProfileUpdateRequest request) {
        Profile profile = getById(profileId);
        if (!profile.getUser().getId().equals(requester.getId()) && !requester.isAdmin()) {
            throw new BusinessRuleException("Vous ne pouvez modifier que votre propre profil.");
        }
        if (request.jobTitle() != null) profile.setJobTitle(request.jobTitle());
        if (request.department() != null) profile.setDepartment(request.department());
        if (request.bio() != null) profile.setBio(request.bio());
        if (request.location() != null) profile.setLocation(request.location());
        if (request.phone() != null) profile.setPhone(request.phone());
        profileRepository.save(profile);
        initializeCollections(profile);
        return profile;
    }

    @Transactional
    public Profile uploadAvatar(UUID profileId, User requester, MultipartFile file) {
        Profile profile = getById(profileId);
        assertOwner(profile, requester);
        FileValidationUtils.validateImage(file);
        String url = mediaStorageService.upload(file, "avatars");
        profile.setAvatarUrl(url);
        profileRepository.save(profile);
        initializeCollections(profile);
        return profile;
    }

    /** Photo de couverture (bannière) — même règles que l'avatar. */
    @Transactional
    public Profile uploadCover(UUID profileId, User requester, MultipartFile file) {
        Profile profile = getById(profileId);
        assertOwner(profile, requester);
        FileValidationUtils.validateImage(file);
        String url = mediaStorageService.upload(file, "covers");
        profile.setCoverUrl(url);
        profileRepository.save(profile);
        initializeCollections(profile);
        return profile;
    }

    private void assertOwner(Profile profile, User requester) {
        if (!profile.getUser().getId().equals(requester.getId()) && !requester.isAdmin()) {
            throw new BusinessRuleException("Vous ne pouvez modifier que votre propre profil.");
        }
    }
}
