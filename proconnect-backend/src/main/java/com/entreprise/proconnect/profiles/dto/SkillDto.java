package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Skill;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record SkillDto(UUID id, @NotBlank String name) {
    public static SkillDto from(Skill skill) {
        return new SkillDto(skill.getId(), skill.getName());
    }
}
