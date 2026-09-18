package com.entreprise.proconnect.common.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        boolean error,
        int statusCode,
        String detail,
        List<String> fieldErrors,
        Instant timestamp
) {
    public static ErrorResponse of(int statusCode, String detail) {
        return new ErrorResponse(true, statusCode, detail, List.of(), Instant.now());
    }

    public static ErrorResponse of(int statusCode, String detail, List<String> fieldErrors) {
        return new ErrorResponse(true, statusCode, detail, fieldErrors, Instant.now());
    }
}
