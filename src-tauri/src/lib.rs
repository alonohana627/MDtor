use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFile {
    relative_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectAsset {
    mime_type: String,
    bytes: Vec<u8>,
}

type CommandResult<T> = Result<T, String>;

fn normalize_project_root(project_path: &str) -> CommandResult<PathBuf> {
    let root = PathBuf::from(project_path);

    if !root.is_dir() {
        return Err("Project folder does not exist.".to_string());
    }

    root.canonicalize()
        .map_err(|error| format!("Could not open project folder: {error}"))
}

fn resolve_project_file(project_path: &str, relative_path: &str) -> CommandResult<PathBuf> {
    let root = normalize_project_root(project_path)?;
    let relative = Path::new(relative_path);

    if relative.is_absolute()
        || relative
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_)))
    {
        return Err("Project file path must stay inside the project folder.".to_string());
    }

    let path = root.join(relative);
    let canonical_path = path
        .canonicalize()
        .map_err(|error| format!("Could not resolve project file: {error}"))?;

    if !canonical_path.starts_with(&root) {
        return Err("Project file path must stay inside the project folder.".to_string());
    }

    Ok(canonical_path)
}

fn resolve_new_project_file(project_path: &str, relative_path: &str) -> CommandResult<PathBuf> {
    let root = normalize_project_root(project_path)?;
    let relative = Path::new(relative_path);

    if relative.is_absolute()
        || relative
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_)))
    {
        return Err("Project file path must stay inside the project folder.".to_string());
    }

    let path = root.join(relative);
    let parent = path.parent().unwrap_or(&root);

    let mut nearest_existing_ancestor = parent;
    while !nearest_existing_ancestor.exists() {
        nearest_existing_ancestor = nearest_existing_ancestor
            .parent()
            .ok_or_else(|| "Could not resolve project file folder.".to_string())?;
    }

    let canonical_parent = nearest_existing_ancestor
        .canonicalize()
        .map_err(|error| format!("Could not resolve project file folder: {error}"))?;

    if !canonical_parent.starts_with(&root) {
        return Err("Project file path must stay inside the project folder.".to_string());
    }

    Ok(path)
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"))
        .unwrap_or(false)
}

fn is_image_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg"
            )
        })
        .unwrap_or(false)
}

fn get_image_mime_type(path: &Path) -> String {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn collect_markdown_files(
    root: &Path,
    current: &Path,
    files: &mut Vec<ProjectFile>,
) -> CommandResult<()> {
    for entry in fs::read_dir(current).map_err(|error| format!("Could not read folder: {error}"))? {
        let entry = entry.map_err(|error| format!("Could not read folder entry: {error}"))?;
        let path = entry.path();
        let metadata = fs::symlink_metadata(&path)
            .map_err(|error| format!("Could not read file metadata: {error}"))?;

        if metadata.is_dir() {
            collect_markdown_files(root, &path, files)?;
        } else if metadata.is_file() && is_markdown_file(&path) {
            let relative_path = path
                .strip_prefix(root)
                .map_err(|error| format!("Could not format project path: {error}"))?
                .to_string_lossy()
                .replace('\\', "/");

            files.push(ProjectFile { relative_path });
        }
    }

    Ok(())
}

#[tauri::command]
fn scan_project_folder(project_path: String) -> CommandResult<Vec<ProjectFile>> {
    let root = normalize_project_root(&project_path)?;
    let mut files = Vec::new();

    collect_markdown_files(&root, &root, &mut files)?;
    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    Ok(files)
}

#[tauri::command]
fn read_project_file(project_path: String, relative_path: String) -> CommandResult<String> {
    let path = resolve_project_file(&project_path, &relative_path)?;

    if !is_markdown_file(&path) {
        return Err("Only Markdown files can be opened.".to_string());
    }

    fs::read_to_string(path).map_err(|error| format!("Could not read Markdown file: {error}"))
}

#[tauri::command]
fn save_project_file(
    project_path: String,
    relative_path: String,
    content: String,
) -> CommandResult<()> {
    let path = resolve_project_file(&project_path, &relative_path)?;

    if !is_markdown_file(&path) {
        return Err("Only Markdown files can be saved.".to_string());
    }

    fs::write(path, content).map_err(|error| format!("Could not save Markdown file: {error}"))
}

#[tauri::command]
fn create_project_file(project_path: String, relative_path: String) -> CommandResult<()> {
    let path = resolve_new_project_file(&project_path, &relative_path)?;

    if !is_markdown_file(&path) {
        return Err("New files must use a .md or .markdown extension.".to_string());
    }

    if path.exists() {
        return Err("A file already exists at that path.".to_string());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create Markdown file folder: {error}"))?;
    }

    fs::write(path, "").map_err(|error| format!("Could not create Markdown file: {error}"))
}

#[tauri::command]
fn delete_project_file(project_path: String, relative_path: String) -> CommandResult<()> {
    let path = resolve_project_file(&project_path, &relative_path)?;

    if !is_markdown_file(&path) {
        return Err("Only Markdown files can be deleted.".to_string());
    }

    fs::remove_file(path).map_err(|error| format!("Could not delete Markdown file: {error}"))
}

#[tauri::command]
fn rename_project_file(
    project_path: String,
    old_relative_path: String,
    new_relative_path: String,
) -> CommandResult<()> {
    let old_path = resolve_project_file(&project_path, &old_relative_path)?;
    let new_path = resolve_new_project_file(&project_path, &new_relative_path)?;

    if !is_markdown_file(&old_path) || !is_markdown_file(&new_path) {
        return Err("Only Markdown files can be renamed.".to_string());
    }

    if new_path.exists() {
        return Err("A file already exists at that path.".to_string());
    }

    if let Some(parent) = new_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create Markdown file folder: {error}"))?;
    }

    fs::rename(old_path, new_path).map_err(|error| format!("Could not rename file: {error}"))
}

#[tauri::command]
fn read_project_asset(
    project_path: String,
    active_file_path: String,
    asset_path: String,
) -> CommandResult<ProjectAsset> {
    let root = normalize_project_root(&project_path)?;
    let active_file = resolve_project_file(&project_path, &active_file_path)?;
    let asset_relative = Path::new(&asset_path);

    if asset_relative.is_absolute()
        || asset_relative
            .components()
            .any(|component| matches!(component, Component::Prefix(_)))
    {
        return Err("Only relative local image paths can be previewed.".to_string());
    }

    let active_parent = active_file.parent().unwrap_or(&root);
    let asset_full_path = active_parent.join(asset_relative);
    let canonical_asset_path = asset_full_path
        .canonicalize()
        .map_err(|error| format!("Could not resolve image file: {error}"))?;

    if !canonical_asset_path.starts_with(&root) {
        return Err("Image path must stay inside the project folder.".to_string());
    }

    if !is_image_file(&canonical_asset_path) {
        return Err("Only local image files can be previewed.".to_string());
    }

    let mime_type = get_image_mime_type(&canonical_asset_path);
    let bytes =
        fs::read(canonical_asset_path).map_err(|error| format!("Could not read image: {error}"))?;

    Ok(ProjectAsset { mime_type, bytes })
}

#[tauri::command]
fn save_export_file(path: String, bytes: Vec<u8>) -> CommandResult<()> {
    fs::write(path, bytes).map_err(|error| format!("Could not save export file: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_project_folder,
            read_project_file,
            save_project_file,
            create_project_file,
            delete_project_file,
            rename_project_file,
            read_project_asset,
            save_export_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_project_root(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("mdtor-{name}-{nonce}"));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn creates_markdown_file_in_new_subdirectory() {
        let root = test_project_root("nested-create");

        create_project_file(
            root.to_string_lossy().to_string(),
            "notes/idea.md".to_string(),
        )
        .unwrap();

        assert!(root.join("notes").join("idea.md").is_file());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_existing_empty_file() {
        let root = test_project_root("existing-empty");
        fs::write(root.join("empty.md"), "").unwrap();

        let result =
            create_project_file(root.to_string_lossy().to_string(), "empty.md".to_string());

        assert_eq!(
            result,
            Err("A file already exists at that path.".to_string())
        );

        fs::remove_dir_all(root).unwrap();
    }
}
