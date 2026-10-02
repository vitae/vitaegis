-- Cover image for a post (a montage's intro frame), uploaded to YouTube as the thumbnail.
alter table content_posts add column if not exists thumb_path text;
