package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.community.dto.JobResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/jobs")
@Tag(name = "Emplois")
public class JobController {

    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;

    public JobController(JobRepository jobRepository, JobApplicationRepository applicationRepository) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Lister les offres d'emploi (paginé)")
    public PageResponse<JobResponse> list(@AuthenticationPrincipal User user, Pageable pageable) {
        Page<Job> page = jobRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PageResponse.from(page.map(j -> JobResponse.from(j, user)));
    }

    @GetMapping("/{id}/")
    @Operation(summary = "Détail d'une offre d'emploi")
    public JobResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return JobResponse.from(getJob(id), user);
    }

    @PostMapping("/")
    @Operation(summary = "Publier une offre d'emploi")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<JobResponse> create(@AuthenticationPrincipal User user, @RequestBody JobResponse request) {
        Job job = Job.builder()
                .title(request.title())
                .company(request.company())
                .companyLogoUrl(request.companyLogo())
                .location(request.location())
                .contractType(request.type())
                .salary(request.salary())
                .description(request.description())
                .requirementsText(request.requirements() == null ? null : String.join("\n", request.requirements()))
                .skillsCsv(request.skills() == null ? null : String.join(",", request.skills()))
                .category(request.category())
                .postedBy(user)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(JobResponse.from(jobRepository.save(job), user));
    }

    @PostMapping("/{id}/apply/")
    @Operation(summary = "Postuler à une offre d'emploi")
    public ResponseEntity<JobResponse> apply(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Job job = getJob(id);
        if (!applicationRepository.existsByUserIdAndJobId(user.getId(), id)) {
            applicationRepository.save(JobApplication.builder().user(user).job(job).build());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(JobResponse.from(job, user));
    }

    private Job getJob(UUID id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offre introuvable."));
    }
}
