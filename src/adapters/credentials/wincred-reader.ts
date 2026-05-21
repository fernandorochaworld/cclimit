import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Credentials } from '../../core/types.js';
import { parseOauth } from './parse.js';

const execFileAsync = promisify(execFile);

const WINCRED_TARGET = 'Claude Code-credentials';

/**
 * PowerShell program that calls the Win32 `CredReadW` API to retrieve
 * the Claude Code credential blob from the Windows Credential Manager
 * and writes the password to stdout.
 *
 * The CREDENTIAL struct is declared in C# so the marshaller handles
 * 32/64-bit pointer padding for us. The blob is stored as UTF-16 LE
 * bytes (PowerShell / Claude Code's "Unicode" encoding on Windows).
 *
 * The blob bytes themselves are written to stdout (no `Write-Host`
 * which would add a newline/encoding conversion); the JSON parser
 * tolerates any trailing whitespace.
 */
const POWERSHELL_SCRIPT = `
$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AiLimitsCred {
  [StructLayout(LayoutKind.Sequential)]
  private struct FILETIME { public uint Low; public uint High; }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  private struct CREDENTIAL {
    public uint Flags;
    public uint Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist;
    public uint AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  private static extern bool CredRead(string target, uint type, uint flags, out IntPtr cred);

  [DllImport("advapi32.dll", SetLastError = true)]
  private static extern void CredFree(IntPtr buffer);

  public static string Read(string target) {
    IntPtr ptr;
    if (!CredRead(target, 1u, 0u, out ptr)) return null;
    try {
      CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
      if (c.CredentialBlobSize == 0 || c.CredentialBlob == IntPtr.Zero) return null;
      byte[] bytes = new byte[c.CredentialBlobSize];
      Marshal.Copy(c.CredentialBlob, bytes, 0, (int)c.CredentialBlobSize);
      return Encoding.Unicode.GetString(bytes);
    } finally {
      CredFree(ptr);
    }
  }
}
'@
Add-Type -TypeDefinition $source -Language CSharp | Out-Null
$result = [AiLimitsCred]::Read('${WINCRED_TARGET}')
if ($null -eq $result) { exit 2 }
[Console]::Out.Write($result)
`;

/**
 * `powershell.exe -EncodedCommand` expects a base64-encoded UTF-16 LE
 * string. Encoding the whole script this way avoids every quoting and
 * line-continuation gotcha cmd.exe / CreateProcess would otherwise add.
 */
function encodeCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64');
}

/**
 * Reads Claude Code credentials from the Windows Credential Manager.
 *
 * Returns `null` on any non-win32 platform, when PowerShell is missing,
 * or when the credential entry does not exist. Claude Code on Windows
 * stores its OAuth credential blob in the Generic Credential store under
 * the target name "Claude Code-credentials" (the same naming scheme it
 * uses for the macOS Keychain entry).
 */
export async function readFromWindowsCredentialManager(): Promise<
  Credentials | null
> {
  if (process.platform !== 'win32') return null;
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-OutputFormat',
        'Text',
        '-EncodedCommand',
        encodeCommand(POWERSHELL_SCRIPT),
      ],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    return parseOauth(stdout);
  } catch {
    return null;
  }
}
