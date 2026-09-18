package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.profiles.dto.CertificationDto;
import com.entreprise.proconnect.profiles.dto.EducationDto;
import com.entreprise.proconnect.profiles.dto.ExperienceDto;
import com.entreprise.proconnect.profiles.dto.ProfileResponse;
import com.entreprise.proconnect.profiles.dto.ProfileSummaryResponse;
import com.entreprise.proconnect.profiles.dto.ProfileUpdateRequest;
import com.entreprise.proconnect.profiles.dto.SkillDto;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Mirrors apps/profiles/urls.py — mounted under /api/v1/profiles/. */
@RestController
@RequestMapping("/api/v1/profiles")
@Tag(name = "Profils professionnels")
public class ProfileController {

    private final ProfileService profileService;
    private final SkillService skillService;
    private final ExperienceRepository experienceRepository;
    private final EducationRepository educationRepository;
    private final CertificationRepository certificationRepository;

    public ProfileController(
            ProfileService profileService,
            SkillService skillService,
            ExperienceRepository experienceRepository,
            EducationRepository educationRepository,
            CertificationRepository certificationRepository
    ) {
        this.profileService = profileService;
        this.skillService = skillService;
        this.experienceRepository = experienceRepository;
        this.educationRepository = educationRepository;
        this.certificationRepository = certificationRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Rechercher des profils (recherche plein texte optionnelle, paginé)")
    public PageResponse<ProfileSummaryResponse> search(
            @RequestParam(required = false) String search, Pageable pageable
    ) {
        Page<Profile> page = profileService.search(search, pageable);
        return PageResponse.from(page.map(ProfileSummaryResponse::from));
    }

    @GetMapping("/directory/")
    @Operation(summary = "Répertoire complet : tous les profils des comptes actifs (sans pagination)")
    public List<ProfileSummaryResponse> directory() {
        return profileService.directory().stream().map(ProfileSummaryResponse::from).toList();
    }

    @GetMapping("/me/")
    @Operation(summary = "Mon profil complet")
    public ProfileResponse me(@AuthenticationPrincipal User user) {
        return ProfileResponse.from(profileService.getDetailByUserId(user.getId()));
    }

    @GetMapping("/{id}/")
    @Operation(summary = "Profil détaillé d'un utilisateur")
    public ProfileResponse detail(@PathVariable UUID id) {
        return ProfileResponse.from(profileService.getById(id));
    }

    @PatchMapping("/{id}/")
    @Operation(summary = "Mettre à jour mon profil (poste, département, bio, localisation, téléphone)")
    public ProfileResponse update(
            @PathVariable UUID id, @AuthenticationPrincipal User user, @RequestBody ProfileUpdateRequest request
    ) {
        return ProfileResponse.from(profileService.update(id, user, request));
    }

    @PostMapping(value = "/me/avatar/", consumes = "multipart/form-data")
    @Operation(summary = "Téléverser ma photo de profil (image, 5 Mo max)")
    public ProfileResponse uploadMyAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        Profile profile = profileService.getOrCreate(user);
        return ProfileResponse.from(profileService.uploadAvatar(profile.getId(), user, file));
    }

    @PostMapping(value = "/me/cover/", consumes = "multipart/form-data")
    @Operation(summary = "Téléverser ma photo de couverture (image, 5 Mo max)")
    public ProfileResponse uploadMyCover(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        Profile profile = profileService.getOrCreate(user);
        return ProfileResponse.from(profileService.uploadCover(profile.getId(), user, file));
    }

    @PostMapping(value = "/{id}/avatar/", consumes = "multipart/form-data")
    @Operation(summary = "Téléverser la photo de profil d'un utilisateur (soi-même ou admin)")
    public ProfileResponse uploadAvatar(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        return ProfileResponse.from(profileService.uploadAvatar(id, user, file));
    }

    @PostMapping(value = "/{id}/cover/", consumes = "multipart/form-data")
    @Operation(summary = "Téléverser la photo de couverture d'un utilisateur (soi-même ou admin)")
    public ProfileResponse uploadCover(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        return ProfileResponse.from(profileService.uploadCover(id, user, file));
    }

    // --- Skills, scoped to the connected user's own profile -----------------

    @GetMapping("/skills/")
    @Operation(summary = "Lister mes compétences")
    public java.util.List<SkillDto> listSkills(@AuthenticationPrincipal User user) {
        return skillService.listForUser(user).stream().map(SkillDto::from).toList();
    }

    @PostMapping("/skills/")
    @Operation(summary = "Ajouter une compétence à mon profil")
    public SkillDto addSkill(@AuthenticationPrincipal User user, @Valid @RequestBody SkillDto request) {
        return SkillDto.from(skillService.add(user, request.name()));
    }

    @DeleteMapping("/skills/{id}/")
    @Operation(summary = "Retirer une compétence de mon profil")
    public void removeSkill(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        skillService.remove(user, id);
    }

    // --- Experiences ----------------------------------------------------

    @GetMapping("/experiences/")
    @Operation(summary = "Lister mes expériences professionnelles")
    public java.util.List<ExperienceDto> listExperiences(@AuthenticationPrincipal User user) {
        Profile profile = profileService.getOrCreate(user);
        return experienceRepository.findByProfileIdOrderByStartDateDesc(profile.getId())
                .stream().map(ExperienceDto::from).toList();
    }

    @PostMapping("/experiences/")
    @Operation(summary = "Ajouter une expérience professionnelle")
    public ExperienceDto addExperience(@AuthenticationPrincipal User user, @Valid @RequestBody ExperienceDto request) {
        Profile profile = profileService.getOrCreate(user);
        Experience experience = Experience.builder()
                .profile(profile).title(request.title()).company(request.company())
                .startDate(request.startDate()).endDate(request.endDate()).description(request.description())
                .build();
        return ExperienceDto.from(experienceRepository.save(experience));
    }

    @DeleteMapping("/experiences/{id}/")
    @Operation(summary = "Supprimer une expérience professionnelle")
    public void removeExperience(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Experience experience = experienceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expérience introuvable."));
        assertOwner(experience.getProfile(), user);
        experienceRepository.delete(experience);
    }

    // --- Education --------------------------------------------------------

    @GetMapping("/education/")
    @Operation(summary = "Lister mes formations")
    public java.util.List<EducationDto> listEducation(@AuthenticationPrincipal User user) {
        Profile profile = profileService.getOrCreate(user);
        return educationRepository.findByProfileIdOrderByStartDateDesc(profile.getId())
                .stream().map(EducationDto::from).toList();
    }

    @PostMapping("/education/")
    @Operation(summary = "Ajouter une formation")
    public EducationDto addEducation(@AuthenticationPrincipal User user, @Valid @RequestBody EducationDto request) {
        Profile profile = profileService.getOrCreate(user);
        Education education = Education.builder()
                .profile(profile).school(request.school()).degree(request.degree())
                .startDate(request.startDate()).endDate(request.endDate())
                .build();
        return EducationDto.from(educationRepository.save(education));
    }

    @DeleteMapping("/education/{id}/")
    @Operation(summary = "Supprimer une formation")
    public void removeEducation(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Education education = educationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation introuvable."));
        assertOwner(education.getProfile(), user);
        educationRepository.delete(education);
    }

    // --- Certifications ---------------------------------------------------

    @GetMapping("/certifications/")
    @Operation(summary = "Lister mes certifications")
    public java.util.List<CertificationDto> listCertifications(@AuthenticationPrincipal User user) {
        Profile profile = profileService.getOrCreate(user);
        return certificationRepository.findByProfileId(profile.getId())
                .stream().map(CertificationDto::from).toList();
    }

    @PostMapping("/certifications/")
    @Operation(summary = "Ajouter une certification")
    public CertificationDto addCertification(@AuthenticationPrincipal User user, @Valid @RequestBody CertificationDto request) {
        Profile profile = profileService.getOrCreate(user);
        Certification certification = Certification.builder()
                .profile(profile).name(request.name()).issuer(request.issuer())
                .issuedDate(request.issuedDate()).expiryDate(request.expiryDate())
                .build();
        return CertificationDto.from(certificationRepository.save(certification));
    }

    @DeleteMapping("/certifications/{id}/")
    @Operation(summary = "Supprimer une certification")
    public void removeCertification(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Certification certification = certificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certification introuvable."));
        assertOwner(certification.getProfile(), user);
        certificationRepository.delete(certification);
    }

    private void assertOwner(Profile profile, User user) {
        if (!profile.getUser().getId().equals(user.getId())) {
            throw new BusinessRuleException("Vous ne pouvez modifier que votre propre profil.");
        }
    }
}
