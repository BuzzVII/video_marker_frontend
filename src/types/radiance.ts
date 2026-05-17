export type RadianceField = {
  id: string;
  project_id: string;
  source_job_id: string | null;
  source_image_set_id: string | null;
  name: string;
  status: string;
  asset_path: string;
  asset_format: string;
  asset_url: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RadianceFieldJob = {
  id: string;
  project_id: string;
  image_set_id: string | null;
  name: string | null;
  status: string;
  stage: string | null;
  progress: number;
  error_message: string | null;
  work_dir: string;
  config_json: Record<string, unknown>;
  result_radiance_field_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StartRadianceFieldJobPayload = {
  image_set_id: string;
  name?: string;
  config?: Record<string, unknown>;
};
