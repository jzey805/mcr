-- 1. Create Churches Table (Tenants)
CREATE TABLE IF NOT EXISTS public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    domain TEXT UNIQUE, -- For future domain masking
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Churches
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own church information
CREATE POLICY "Users can view their own church" ON public.churches
    FOR SELECT USING (
        id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    );

-- 2. Create Profiles Table (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id),
    full_name TEXT,
    role TEXT DEFAULT 'Member', -- Super Admin, Admin, Leader, Member
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their church" ON public.profiles
    FOR SELECT USING (
        church_id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Create Members Table (Per Church)
CREATE TABLE IF NOT EXISTS public.church_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) NOT NULL,
    name TEXT NOT NULL,
    initials TEXT,
    role TEXT[],
    joined TEXT,
    family TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    age INTEGER,
    dob DATE,
    occupation TEXT,
    status TEXT, -- Pastor, Leader, Member, New Friend
    referral_source TEXT,
    friends_with UUID[], -- Array of IDs
    skills TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Church Members
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Church members data isolation" ON public.church_members
    FOR ALL USING (
        church_id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    );

-- 4. Create Member Relationships (Links)
CREATE TABLE IF NOT EXISTS public.member_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) NOT NULL,
    source_id UUID REFERENCES public.church_members(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.church_members(id) ON DELETE CASCADE,
    type TEXT, -- Mentor, Family, Team Member, Invited, Friend
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on Member Links
ALTER TABLE public.member_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Member links data isolation" ON public.member_links
    FOR ALL USING (
        church_id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid())
    );

-- 5. FUNCTION: Handle new user registration
-- This function will be triggered when a user signs up via Auth and creates a profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    target_church_id UUID;
    church_name TEXT;
BEGIN
    -- Find church by code (passed in metadata)
    SELECT id INTO target_church_id FROM public.churches WHERE code = NEW.raw_user_meta_data->>'church_code';
    
    -- If church doesn't exist, create a default one or handle error
    IF target_church_id IS NULL THEN
        -- Optionally create a new church if we want self-service onboarding
        -- INSERT INTO public.churches (name, code) VALUES ('New Church', NEW.raw_user_meta_data->>'church_code') RETURNING id INTO target_church_id;
        
        -- For now, we assume church must exist or we map to a 'PENDING' church if needed
        -- Or just fallback to a default ID for 'tester' church if specified
    END IF;

    INSERT INTO public.profiles (id, church_id, full_name, role)
    VALUES (
        NEW.id,
        target_church_id,
        NEW.raw_user_meta_data->>'full_name',
        'Member'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function on auth.users insert
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
