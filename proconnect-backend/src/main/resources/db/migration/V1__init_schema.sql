-- V1__init_schema.sql
-- Initial schema for ProConnect, covering all 6 modules from the cahier des charges.

CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    first_name      VARCHAR(150) NOT NULL,
    last_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'EMPLOYEE',
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    staff           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP    NOT NULL
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

-- --- Profiles -----------------------------------------------------------

CREATE TABLE profiles (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    avatar_url  VARCHAR(500),
    job_title   VARCHAR(150),
    department  VARCHAR(150),
    bio         VARCHAR(2000),
    location    VARCHAR(150),
    phone       VARCHAR(30),
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

CREATE TABLE skills (
    id          UUID PRIMARY KEY,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_skill_per_profile UNIQUE (profile_id, name)
);

CREATE TABLE experiences (
    id          UUID PRIMARY KEY,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    company     VARCHAR(150) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE,
    description VARCHAR(2000),
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

CREATE TABLE education (
    id          UUID PRIMARY KEY,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school      VARCHAR(150) NOT NULL,
    degree      VARCHAR(150) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

CREATE TABLE certifications (
    id          UUID PRIMARY KEY,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    issuer      VARCHAR(150) NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

-- --- Connections ----------------------------------------------------------

CREATE TABLE connections (
    id            UUID PRIMARY KEY,
    requester_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    responded_at  TIMESTAMP,
    created_at    TIMESTAMP NOT NULL,
    updated_at    TIMESTAMP NOT NULL,
    CONSTRAINT no_self_connection CHECK (requester_id <> addressee_id)
);
CREATE INDEX idx_connections_requester_status ON connections(requester_id, status);
CREATE INDEX idx_connections_addressee_status ON connections(addressee_id, status);
-- Defense in depth: the application layer already checks this (ConnectionService),
-- but a partial unique index guarantees it even under concurrent requests.
CREATE UNIQUE INDEX unique_active_connection_pair
    ON connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
    WHERE status IN ('PENDING', 'ACCEPTED');

CREATE TABLE blocks (
    id          UUID PRIMARY KEY,
    blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- --- Feed -----------------------------------------------------------------

CREATE TABLE posts (
    id          UUID PRIMARY KEY,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     VARCHAR(10000),
    post_type   VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    visibility  VARCHAR(20) NOT NULL DEFAULT 'EVERYONE',
    hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_post_author_created ON posts(author_id, created_at);

CREATE TABLE post_attachments (
    id              UUID PRIMARY KEY,
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_url        VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    attachment_type VARCHAR(20) NOT NULL,
    size_bytes      BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);

CREATE TABLE likes (
    id          UUID PRIMARY KEY,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_like_per_user_post UNIQUE (post_id, user_id)
);

CREATE TABLE comments (
    id          UUID PRIMARY KEY,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    content     VARCHAR(5000),
    sticker     VARCHAR(50),
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

-- --- Messaging --------------------------------------------------------

CREATE TABLE conversations (
    id          UUID PRIMARY KEY,
    is_group    BOOLEAN NOT NULL DEFAULT FALSE,
    name        VARCHAR(150),
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

CREATE TABLE conversation_participants (
    id              UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL,
    CONSTRAINT unique_participant_per_conversation UNIQUE (conversation_id, user_id)
);

CREATE TABLE messages (
    id              UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         VARCHAR(5000),
    attachment_url  VARCHAR(500),
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);
CREATE INDEX idx_message_conversation_created ON messages(conversation_id, created_at);

-- --- Notifications ----------------------------------------------------

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY,
    recipient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_type   VARCHAR(30) NOT NULL,
    object_id           UUID,
    message             VARCHAR(255) NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL
);
CREATE INDEX idx_notifications_recipient_read_created ON notifications(recipient_id, is_read, created_at);
