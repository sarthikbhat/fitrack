-- Let a user remove one of their own followers.
--
-- The follow graph is follower-owned: 0004 only allows the follower to delete their
-- edge (follows_delete_own: auth.uid() = follower). To support "Remove follower",
-- the followee must also be able to delete an edge that points at them. RLS DELETE
-- policies are permissive and OR together, so adding this one alongside the existing
-- policy means a row is deletable by EITHER the follower (unfollow) or the followee
-- (remove follower).
create policy follows_delete_by_followee on public.follows
  for delete using (auth.uid() = followee);
