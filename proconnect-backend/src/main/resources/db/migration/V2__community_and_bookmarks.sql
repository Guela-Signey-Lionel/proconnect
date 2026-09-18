-- V2__community_and_bookmarks.sql
-- Tables for the community module (events, jobs, groups, stories) + feed bookmarks.

-- --- Bookmarks (publications enregistrées) --------------------------------

CREATE TABLE bookmarks (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_bookmark_per_user_post UNIQUE (user_id, post_id)
);
CREATE INDEX idx_bookmarks_user_created ON bookmarks(user_id, created_at);

-- --- Événements ------------------------------------------------------------

CREATE TABLE events (
    id                  UUID PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(3000),
    event_date          DATE NOT NULL,
    time                VARCHAR(50),
    location            VARCHAR(200) NOT NULL,
    type                VARCHAR(50),
    image_url           VARCHAR(500),
    organizer_name      VARCHAR(150),
    organizer_logo_url  VARCHAR(500),
    tags_csv            VARCHAR(500),
    max_attendees       INTEGER NOT NULL DEFAULT 0,
    created_by_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL
);
CREATE INDEX idx_events_date ON events(event_date);

CREATE TABLE event_registrations (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_registration_per_user_event UNIQUE (user_id, event_id)
);

-- --- Emplois ----------------------------------------------------------------

CREATE TABLE jobs (
    id                  UUID PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    company             VARCHAR(150) NOT NULL,
    company_logo_url    VARCHAR(500),
    location            VARCHAR(150) NOT NULL,
    contract_type       VARCHAR(30),
    salary              VARCHAR(100),
    description         VARCHAR(3000),
    requirements_text   VARCHAR(3000),
    skills_csv          VARCHAR(1000),
    category            VARCHAR(50),
    posted_by_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL
);

CREATE TABLE job_applications (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    CONSTRAINT unique_application_per_user_job UNIQUE (user_id, job_id)
);

-- --- Groupes ------------------------------------------------------------------

CREATE TABLE groups (
    id              UUID PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     VARCHAR(2000),
    cover_image_url VARCHAR(500),
    avatar_url      VARCHAR(500),
    category        VARCHAR(50),
    visibility      VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    rules_text      VARCHAR(3000),
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);

CREATE TABLE group_members (
    group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_posts (
    id          UUID PRIMARY KEY,
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

-- --- Stories (éphémères, 24 h) --------------------------------------------------

CREATE TABLE stories (
    id          UUID PRIMARY KEY,
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url   VARCHAR(500),
    caption     VARCHAR(300),
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_stories_expires ON stories(expires_at);
