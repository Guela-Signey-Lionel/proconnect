package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/** Offre d'emploi interne — alimente la page Emplois du frontend. */
@Entity
@Table(name = "jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Job extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 150)
    private String company;

    @Column(length = 500)
    private String companyLogoUrl;

    @Column(nullable = false, length = 150)
    private String location;

    /** CDI, CDD, Freelance, Stage, Alternance */
    @Column(length = 30)
    private String contractType;

    @Column(length = 100)
    private String salary;

    @Column(length = 3000)
    private String description;

    /** Une exigence par ligne. */
    @Column(length = 3000)
    private String requirementsText;

    /** Compétences séparées par des virgules. */
    @Column(length = 1000)
    private String skillsCsv;

    /** Product Management, Développement, Design… */
    @Column(length = 50)
    private String category;

    @ManyToOne
    @JoinColumn(name = "posted_by_id")
    private User postedBy;

    @jakarta.persistence.OneToMany(mappedBy = "job", fetch = jakarta.persistence.FetchType.LAZY)
    @lombok.Builder.Default
    private java.util.List<JobApplication> applications = new java.util.ArrayList<>();
}
