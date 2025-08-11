# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_20       
    pkgs.bun       
    pkgs.mariadb        
  ];
}
