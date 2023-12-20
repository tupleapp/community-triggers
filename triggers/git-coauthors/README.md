# git-coauthors

Automatically add git coauthors when pairing on a call.

Updates the file `$HOME/.gitmessage` with each participant as a coauthor.

Ensure that `$HOME/.gitmessage` shows up in your commit template with the following command:

```sh
$ git config --global commit.template $HOME/.gitmessage
```

For Windows you can use:

```batch
> git config --global commit.template %USERPROFILE%\.gitmessage
```
