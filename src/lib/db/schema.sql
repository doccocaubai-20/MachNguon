-- gen_random_uuid() is built-in in PostgreSQL 13+

-- 1. Profiles / Users Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Workspaces (Kho gia đình)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Memberships (Thành viên & Vai trò trong Kho)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'contributor', 'viewer', 'narrator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

-- 4. Workspace Invitations (Lời mời tham gia Kho)
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'contributor', 'viewer', 'narrator')),
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Audit Events (Nhật ký kiểm toán truy cập & thay đổi)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_user ON memberships(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_events(workspace_id);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_active_workspace_member(check_workspace_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM memberships
        WHERE workspace_id = check_workspace_id
          AND user_id = check_user_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_workspace_role(check_workspace_id UUID, check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    found_role TEXT;
BEGIN
    SELECT role INTO found_role FROM memberships
    WHERE workspace_id = check_workspace_id
      AND user_id = check_user_id
      AND status = 'active';
    RETURN found_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) & Force on table owners
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- Current app session user setting simulation for testing & Supabase compatibility
CREATE OR REPLACE FUNCTION auth_uid()
RETURNS UUID AS $$
BEGIN
    IF current_setting('request.jwt.claim.sub', true) IS NOT NULL AND current_setting('request.jwt.claim.sub', true) <> '' THEN
        RETURN current_setting('request.jwt.claim.sub', true)::UUID;
    END IF;
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies for Workspaces
DROP POLICY IF EXISTS workspaces_select_policy ON workspaces;
CREATE POLICY workspaces_select_policy ON workspaces
    FOR SELECT
    USING (is_active_workspace_member(id, auth_uid()));

DROP POLICY IF EXISTS workspaces_insert_policy ON workspaces;
CREATE POLICY workspaces_insert_policy ON workspaces
    FOR INSERT
    WITH CHECK (auth_uid() IS NOT NULL AND created_by = auth_uid());

DROP POLICY IF EXISTS workspaces_update_policy ON workspaces;
CREATE POLICY workspaces_update_policy ON workspaces
    FOR UPDATE
    USING (get_workspace_role(id, auth_uid()) = 'admin');

-- RLS Policies for Memberships
DROP POLICY IF EXISTS memberships_select_policy ON memberships;
CREATE POLICY memberships_select_policy ON memberships
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS memberships_insert_policy ON memberships;
CREATE POLICY memberships_insert_policy ON memberships
    FOR INSERT
    WITH CHECK (
        -- Either an admin is adding a member, or the user is creating the initial admin membership for themselves
        get_workspace_role(workspace_id, auth_uid()) = 'admin'
        OR (user_id = auth_uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS memberships_update_policy ON memberships;
CREATE POLICY memberships_update_policy ON memberships
    FOR UPDATE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- RLS Policies for Audit Events
DROP POLICY IF EXISTS audit_select_policy ON audit_events;
CREATE POLICY audit_select_policy ON audit_events
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS audit_insert_policy ON audit_events;
CREATE POLICY audit_insert_policy ON audit_events
    FOR INSERT
    WITH CHECK (auth_uid() IS NOT NULL AND user_id = auth_uid());


-- 6. Persons (Hồ sơ người thân trong gia đình - P02)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nick_name TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    birth_date TEXT,
    death_date TEXT,
    bio TEXT,
    avatar_url TEXT,
    linked_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Person Relationships (Mối quan hệ gia đình & phả hệ)
CREATE TABLE IF NOT EXISTS person_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    related_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent', 'child', 'spouse', 'sibling', 'grandparent', 'grandchild', 'relative')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_not_self CHECK (person_id <> related_person_id),
    CONSTRAINT unique_person_rel UNIQUE (person_id, related_person_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_persons_workspace ON persons(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rel_person ON person_relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_rel_related ON person_relationships(related_person_id);

-- RLS Policies for Persons
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons FORCE ROW LEVEL SECURITY;
ALTER TABLE person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_relationships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS persons_select_policy ON persons;
CREATE POLICY persons_select_policy ON persons
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS persons_insert_policy ON persons;
CREATE POLICY persons_insert_policy ON persons
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS persons_update_policy ON persons;
CREATE POLICY persons_update_policy ON persons
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS persons_delete_policy ON persons;
CREATE POLICY persons_delete_policy ON persons
    FOR DELETE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- RLS Policies for Person Relationships
DROP POLICY IF EXISTS rel_select_policy ON person_relationships;
CREATE POLICY rel_select_policy ON person_relationships
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS rel_insert_policy ON person_relationships;
CREATE POLICY rel_insert_policy ON person_relationships
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS rel_delete_policy ON person_relationships;
CREATE POLICY rel_delete_policy ON person_relationships
    FOR DELETE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );


-- 8. Assets (Kho tư liệu: âm thanh, ảnh, tài liệu PDF - P03)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('audio', 'image', 'document')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    checksum TEXT,
    duration_seconds NUMERIC,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    narrator_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS shared_with_family BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_assets_narrator ON assets(narrator_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(workspace_id, asset_type);

-- RLS Policies for Assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_select_policy ON assets;
CREATE POLICY assets_select_policy ON assets
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()) AND (shared_with_family OR uploaded_by = auth_uid()));

DROP POLICY IF EXISTS assets_insert_policy ON assets;
CREATE POLICY assets_insert_policy ON assets
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS assets_delete_policy ON assets;
CREATE POLICY assets_delete_policy ON assets
    FOR DELETE
    USING (
        get_workspace_role(workspace_id, auth_uid()) = 'admin'
        OR (uploaded_by = auth_uid() AND is_active_workspace_member(workspace_id, auth_uid()))
    );


-- 9. Transcript Segments (Bản chép lời theo mốc thời gian - P04)
CREATE TABLE IF NOT EXISTS transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    segment_order INT NOT NULL,
    start_time_seconds NUMERIC NOT NULL,
    end_time_seconds NUMERIC NOT NULL,
    speaker TEXT,
    text TEXT NOT NULL,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_asset ON transcript_segments(asset_id, segment_order);

-- 10. Stories (Câu chuyện có nguồn & quản lý phiên bản - P04)
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    narrator_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    primary_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
    version_number INT NOT NULL DEFAULT 1,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_workspace ON stories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stories_narrator ON stories(narrator_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(workspace_id, status);

-- 11. Story Evidence Refs (Trích dẫn bằng chứng gắn mốc âm thanh/tư liệu gốc)
CREATE TABLE IF NOT EXISTS story_evidence_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    start_time_seconds NUMERIC,
    end_time_seconds NUMERIC,
    quote_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_story ON story_evidence_refs(story_id);

-- RLS Policies for Transcripts
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transcripts_select_policy ON transcript_segments;
CREATE POLICY transcripts_select_policy ON transcript_segments
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS transcripts_insert_policy ON transcript_segments;
CREATE POLICY transcripts_insert_policy ON transcript_segments
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

-- RLS Policies for Stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_select_policy ON stories;
CREATE POLICY stories_select_policy ON stories
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS stories_insert_policy ON stories;
CREATE POLICY stories_insert_policy ON stories
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS stories_update_policy ON stories;
CREATE POLICY stories_update_policy ON stories
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS stories_delete_policy ON stories;
CREATE POLICY stories_delete_policy ON stories
    FOR DELETE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- RLS Policies for Story Evidence Refs
ALTER TABLE story_evidence_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_evidence_refs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_select_policy ON story_evidence_refs;
CREATE POLICY evidence_select_policy ON story_evidence_refs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM stories s
            WHERE s.id = story_evidence_refs.story_id
              AND is_active_workspace_member(s.workspace_id, auth_uid())
        )
    );

-- 12. Timeline Events (Dòng thời gian sự kiện gia đình - P05)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    year INT NOT NULL,
    date_display TEXT NOT NULL,
    date_precision TEXT NOT NULL DEFAULT 'year' CHECK (date_precision IN ('exact', 'month', 'year', 'decade', 'approximate')),
    location TEXT,
    importance TEXT NOT NULL DEFAULT 'normal' CHECK (importance IN ('normal', 'milestone', 'major')),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_ws_year ON timeline_events(workspace_id, year ASC);

-- 13. Timeline Event Persons (Gắn kết người thân với sự kiện)
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS year_end INTEGER CHECK (year_end >= year AND year_end <= 2100);

CREATE TABLE IF NOT EXISTS timeline_event_persons (
    event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role_description TEXT,
    PRIMARY KEY (event_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_person ON timeline_event_persons(person_id);

-- 14. Timeline Event Assets (Gắn kết tư liệu ảnh/âm thanh với sự kiện)
CREATE TABLE IF NOT EXISTS timeline_event_assets (
    event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    caption TEXT,
    PRIMARY KEY (event_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_asset ON timeline_event_assets(asset_id);

-- RLS Policies for Timeline Events
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timeline_events_select_policy ON timeline_events;
CREATE POLICY timeline_events_select_policy ON timeline_events
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS timeline_events_insert_policy ON timeline_events;
CREATE POLICY timeline_events_insert_policy ON timeline_events
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS timeline_events_update_policy ON timeline_events;
CREATE POLICY timeline_events_update_policy ON timeline_events
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS timeline_events_delete_policy ON timeline_events;
CREATE POLICY timeline_events_delete_policy ON timeline_events
    FOR DELETE
    USING (
        get_workspace_role(workspace_id, auth_uid()) = 'admin'
        OR created_by = auth_uid()
    );

-- RLS Policies for Timeline Event Persons
ALTER TABLE timeline_event_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_event_persons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timeline_event_persons_select_policy ON timeline_event_persons;
CREATE POLICY timeline_event_persons_select_policy ON timeline_event_persons
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM timeline_events te
            WHERE te.id = timeline_event_persons.event_id
              AND is_active_workspace_member(te.workspace_id, auth_uid())
        )
    );

-- RLS Policies for Timeline Event Assets
ALTER TABLE timeline_event_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_event_assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timeline_event_assets_select_policy ON timeline_event_assets;
CREATE POLICY timeline_event_assets_select_policy ON timeline_event_assets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM timeline_events te
            WHERE te.id = timeline_event_assets.event_id
              AND is_active_workspace_member(te.workspace_id, auth_uid())
        )
    );

-- 15. Graph Entities (Các nút thực thể tri thức: person, place, event, skill - P06)
CREATE TABLE IF NOT EXISTS graph_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'place', 'event', 'skill')),
    name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_entities_ws ON graph_entities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_entities_type ON graph_entities(workspace_id, entity_type);

-- 16. Graph Claims (Các cạnh / phát biểu liên kết có nguồn - P06)
CREATE TABLE IF NOT EXISTS graph_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    statement TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'unverified', 'confirmed', 'rejected')),
    evidence_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    evidence_quote TEXT,
    start_time_seconds NUMERIC,
    end_time_seconds NUMERIC,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_claims_ws ON graph_claims(workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_claims_source ON graph_claims(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_claims_target ON graph_claims(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_graph_claims_status ON graph_claims(workspace_id, status);

-- RLS Policies for Graph Entities
ALTER TABLE graph_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_entities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS graph_entities_select_policy ON graph_entities;
CREATE POLICY graph_entities_select_policy ON graph_entities
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS graph_entities_insert_policy ON graph_entities;
CREATE POLICY graph_entities_insert_policy ON graph_entities
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS graph_entities_update_policy ON graph_entities;
CREATE POLICY graph_entities_update_policy ON graph_entities
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS graph_entities_delete_policy ON graph_entities;
CREATE POLICY graph_entities_delete_policy ON graph_entities
    FOR DELETE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- RLS Policies for Graph Claims
ALTER TABLE graph_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_claims FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS graph_claims_select_policy ON graph_claims;
CREATE POLICY graph_claims_select_policy ON graph_claims
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS graph_claims_insert_policy ON graph_claims;
CREATE POLICY graph_claims_insert_policy ON graph_claims
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS graph_claims_update_policy ON graph_claims;
CREATE POLICY graph_claims_update_policy ON graph_claims
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS graph_claims_delete_policy ON graph_claims;
CREATE POLICY graph_claims_delete_policy ON graph_claims
    FOR DELETE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- 17. Practice Manuals (Tủ kinh nghiệm & Cẩm nang thực hành - P07)
CREATE TABLE IF NOT EXISTS practice_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    skill_entity_id UUID REFERENCES graph_entities(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT,
    cover_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved')),
    version_number INT NOT NULL DEFAULT 1,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manuals_ws ON practice_manuals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_manuals_skill ON practice_manuals(skill_entity_id);
CREATE INDEX IF NOT EXISTS idx_manuals_status ON practice_manuals(workspace_id, status);

-- 18. Manual Practice Notes (Góc hỏi đáp & Ghi chép thực hành của con cháu - P07)
CREATE TABLE IF NOT EXISTS manual_practice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    manual_id UUID NOT NULL REFERENCES practice_manuals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_manual ON manual_practice_notes(manual_id);

-- RLS Policies for Practice Manuals
ALTER TABLE practice_manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_manuals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS manuals_select_policy ON practice_manuals;
CREATE POLICY manuals_select_policy ON practice_manuals
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS manuals_insert_policy ON practice_manuals;
CREATE POLICY manuals_insert_policy ON practice_manuals
    FOR INSERT
    WITH CHECK (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS manuals_update_policy ON practice_manuals;
CREATE POLICY manuals_update_policy ON practice_manuals
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'contributor', 'narrator')
    );

DROP POLICY IF EXISTS manuals_delete_policy ON practice_manuals;
CREATE POLICY manuals_delete_policy ON practice_manuals
    FOR DELETE
    USING (get_workspace_role(workspace_id, auth_uid()) = 'admin');

-- RLS Policies for Manual Practice Notes
ALTER TABLE manual_practice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_practice_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notes_select_policy ON manual_practice_notes;
CREATE POLICY notes_select_policy ON manual_practice_notes
    FOR SELECT
    USING (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS notes_insert_policy ON manual_practice_notes;
CREATE POLICY notes_insert_policy ON manual_practice_notes
    FOR INSERT
    WITH CHECK (is_active_workspace_member(workspace_id, auth_uid()));

DROP POLICY IF EXISTS notes_update_policy ON manual_practice_notes;
CREATE POLICY notes_update_policy ON manual_practice_notes
    FOR UPDATE
    USING (
        is_active_workspace_member(workspace_id, auth_uid())
        AND get_workspace_role(workspace_id, auth_uid()) IN ('admin', 'narrator', 'contributor')
    );

-- 19. Schema Migrations Tracker
CREATE TABLE IF NOT EXISTS _schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. User Sessions Table (Quản lý phiên đăng nhập thực tế)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- 21. Story Versions (Lưu các phiên bản câu chuyện đã phê duyệt - P04)
CREATE TABLE IF NOT EXISTS story_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_story_version UNIQUE (story_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_story_versions_story ON story_versions(story_id, version_number DESC);

-- 22. Practice Manual Versions (Lưu các phiên bản cẩm nang đã phê duyệt - P07)
CREATE TABLE IF NOT EXISTS practice_manual_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id UUID NOT NULL REFERENCES practice_manuals(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_manual_version UNIQUE (manual_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_manual_versions_manual ON practice_manual_versions(manual_id, version_number DESC);




