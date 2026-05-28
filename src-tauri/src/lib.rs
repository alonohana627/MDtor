use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFile {
    relative_path: String,
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
    let canonical_parent = parent
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
            delete_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
