package com.entreprise.proconnect.common.exception;

/** Raised when a request violates a business rule from the cahier des charges (section 40). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
