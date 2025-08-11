# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_20         # Node.js LTS (you can switch to _18 or _22 if needed)
    pkgs.bun               # Bun.sh runtime
    pkgs.mariadb             # MySQL server + client
  ];

  shellHook = ''
    echo "🔧 Dev environment loaded with Node.js, Bun, and MySQL"
    echo "➡ node version: $(node -v)"
    echo "➡ bun version: $(bun -v)"
    echo "➡ mysql version: $(mysql --version)"

    # Optional: start mysql server if needed (for non-system-wide use)
    # Note: this requires MySQL data directory and configuration
    # echo "⚠ If needed, initialize MySQL: mysqld --initialize-insecure"
    # echo "⚠ Then run MySQL server: mysqld &"
  '';
}
