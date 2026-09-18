package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SkillService {

    private final SkillRepository skillRepository;
    private final ProfileService profileService;

    public SkillService(SkillRepository skillRepository, ProfileService profileService) {
        this.skillRepository = skillRepository;
        this.profileService = profileService;
    }

    public List<Skill> listForUser(User user) {
        Profile profile = profileService.getOrCreate(user);
        return skillRepository.findByProfileId(profile.getId());
    }

    @Transactional
    public Skill add(User user, String name) {
        Profile profile = profileService.getOrCreate(user);
        return skillRepository.save(Skill.builder().profile(profile).name(name).build());
    }

    @Transactional
    public void remove(User user, UUID skillId) {
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new ResourceNotFoundException("Compétence introuvable."));
        if (!skill.getProfile().getUser().getId().equals(user.getId())) {
            throw new BusinessRuleException("Vous ne pouvez supprimer que vos propres compétences.");
        }
        skillRepository.delete(skill);
    }
}
