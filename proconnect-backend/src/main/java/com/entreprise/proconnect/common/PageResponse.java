package com.entreprise.proconnect.common;

import java.util.List;
import org.springframework.data.domain.Page;

/** Uniform pagination envelope returned by every list endpoint. */
public record PageResponse<T>(
        List<T> results,
        long count,
        int numPages,
        int currentPage
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber()
        );
    }
}
