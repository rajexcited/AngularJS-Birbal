### SKILLS needed:
    - Git and Github
    - node and npm
    - grunt
    - angularjs
    - react
    - D3 charts

##### Use debugMode true to understand extension flow and interceptions with app.

### To Start:
  - Clone the repository: ``` git clone https://github.com/rajexcited/AngularJS-Birbal.git ```
  - run below commands in project folder.

      ```
      npm install
      npm run build
      ```

  - select 'developer moder' option on extensions page. and use 'load unpacked extension' option to upload the project folder.
  - to update, install, manage dependencies and clean dist specifically, use this command
    ```
    npm run clean
    ```

  - To update and compile files for extension while developing
    ```
    npm run build
    ```

    - use package node script to build extension zip

    -  Use babel to compile react files for popup page development.
    ```
    npm run babel
    ```

  - To run example,
    ```
    grunt connect:example
    ```

### GIT
[Git Guide Book ](http://git-scm.com/book/en/v2)

[Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)

- check out local branch from master.
   Ex. For any issue, use issue#number e.g. issue1

   FYI,  issue also can be broken down into multi branches to avoid confusion.
Hierarchy can be

        Master ->   local branch issue1
        issue1 -> issue1-phase1, issue1-phase2,issue1-phase3

        once phase branch code is done - merge changes to issue1
        the whole issue1 is completed, merge to master.

- commit changes to local branch.
 DO NOT push or merge any changes until the purpose of branc is resolve.
 Because, if anything goes wrong, can delete/discard the branch without affecting master or ongoing development.

- when development is done for local branch, make sure changes are not conflicting with master.

        1. no conflict  ==>  Merge local branch with master. and push to origin/master.
        2. conflict     ==>  create a new branch named- conflictIssue1 from master.
                            and try to merge issue1 to this branch. if anything goes wrong delete the conflict branch. and resolve using same technique.

- To avoid most conflict or unsaved shared changes, commit everything to local branch before switching it.

- Useful commands

```
# inline commit with msg
git commit -a -m 'made other changes'

# commit with multiline msg
git commit -a

# to get commit status
git status

# The useful --merged and --no-merged options can filter this list to branches that you have or have not yet merged into the branch you’re currently on
git branch --merged
git branch --no-merged

# to delete branch
git branch -d testing

# to create a new local branch and switch to it.  -b to create
git checkout -b issue1

# merge iss53 branch to current
git merge issue1

# publishing local branch to github
git push origin v0.0.0:v0.0.0

# tags
git tag
git tag -a v0.0.7 -m "v0.0.7 - dependency graph"
git push origin v0.0.7

# Rewrite your master branch so that any commits of yours that
# aren't already in upstream/master are replayed on top of that
# other branch:

git rebase upstream/master
```
