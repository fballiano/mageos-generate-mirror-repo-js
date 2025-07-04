# Mage-OS Composer Repository Generator

## Background

This project was started not with the primary goal to go into production, but rather to explore and learn how to build Magento Open Source releases.  
It has evolved to be used in production. However, the intention is to create additional implementations, for example in Rust <https://github.com/mage-os/package-splitter>.  

## Generated composer repositories

The generator is used to generate the following composer repositories:

- https://mirror.mage-os.org
- https://upstream-nightly.mage-os.org
- https://repo.mage-os.org

It can also be used to generate custom mirrors and releases based on Mage-OS.

## Versions generated for mirrors

When generating a mirror composer repository, all packages required to install Magento Open Source 2.3.7-p3 and newer will be created.
This might change in the future.

## Usage

This project provides a docker image to generate a composer package repository.  

Mount the directory to contain the generated files into `/build` while executing the image.  
Usually this will be the DOCUMENT_ROOT of the host serving the composer repo, for example `--volume /var/www/html:/build`.  

### Specifying the build target(s)

This project can generate different types of composer repositories. At the time of writing, the supported build targets are

#### `--target=mirror` (default)

By default, a Magento Open Source mirror repository is generated.

#### `--target=upstream-nightly`

This generates a release of the current development versions of Magento Open Source. This is known as an "upstream nightly" build.

#### `--target=mageos-nightly`

This generates a release of the current development versions of Mage-OS. This is known as a "nightly" build.

#### `--target=release`

This build target requires a number of additional arguments:
* `--mageosRelease=x.x.x` The release version, for example 1.0.0
* `--mageosVendor=mage-os` The composer vendor name for the release. Defaults to `mage-os` 
* `--upstreamRelease=2.4.6-p1` The corresponding Magento Open Source release.


### Caching git repositories

Caching git repos is optional. Without caching, every git repository will be cloned each time the repo is generated. This ensures the latest versions will be used to generate the packages.  
However, cloning large repositories like Magento Open Source takes some time, so it can be beneficial to cache the cloned repository.  

A local directory can be mounted at `/generate-repo/repositories` in order to cache the cloned GitHub repos.  
Be aware that existing git repositories currently will not be updated on subsequent runs. This is mainly useful during development when executing the container image multiple times consecutively.
If you want to update a cached git repo before packages are generated, either delete the cache dir, or run `git fetch --tags` manually before executing the image. 

Example: `--volume "${HOME}/repo-cache:/generate-repo/repositories"`

### Mounting a composer dir

A `~/.composer` directory can be mounted, too, which will allow satis to benefit from existing caches. This doesn't make a big difference though.  
Example: `--volume "${COMPOSER_HOME:-$HOME/.composer}:/composer"`

### Example with docker

To generate the repository in the directory `~/html`, run the following command, replacing `https://mirror.mage-os.org` with the URL of your mirror:

```bash
docker run --rm --init -it --user $(id -u):$(id -g) \
  --volume "$(pwd)/html:/build" \
  --volume "${COMPOSER_HOME:-$HOME/.composer}:/composer" \
  magece/mageos-repo-js:latest  --target=mirror --mirror-base-url=https://mirror.mage-os.org
```

### podman

If you prefer to execute the container with `podman`, you should not specify the `--user` argument, as the in-container root user will automatically map to the current system user.
To generate the repository in `~/html` using podman, run the following command, replacing `https://mirror.mage-os.org` with the URL of your mirror:

```bash
podman run --rm --init -it \
  --volume "$(pwd)/html:/build:z"  \
  --volume "${COMPOSER_HOME:-$HOME/.composer}:/composer:z" \
  magece/mageos-repo-js:latest --mirror-base-url=https://mirror.mage-os.org
```

### Manual generation

It is possible to generate the composer repositories without a container.  
This process can be useful for automation, for example the mage-os composer repositories are built in this way via GitHub actions.  

For this, you'll need nodejs 16, php8-0 (or 7.4), yarn, git and composer.

Also, the [github.com/mage-os/php-dependency-list](https://github.com/mage-os/php-dependency-list) phar executable is expected to be in the PATH.

```sh
curl -L https://github.com/mage-os/php-dependency-list/raw/main/php-classes.phar -o /usr/local/bin/php-classes.phar
chmod +x /usr/local/bin/php-classes.phar
```

Check the corresponding workflows in `.github/workflows` for details on how to run the generation.

## Generating custom releases based on Mage-OS

Currently, the manual generation approach needs to be used to create custom releases.  
Two things are required:

* Specify a custom vendor name using the `--mageosVendor=extreme-commerce` option
* Provide custom meta-package dependency templates in `resource/composer-templates/{vendor-name}/`  
  See the existing ones in `resource/composer-templates/mage-os` for examples.  
  In future it will be possible to specify the composer-templates path with a command line argument.


## Building the docker image

```bash
docker build -t magece/mirror-repo-js .
```

## Process of building a new mirror release

A new mirror release gets created when Magento releases a new version.  
The process is composed of a series of steps across 3 repositories of the mage-os organization.

### 0. Preliminary check

Before starting, make sure that the new tags are merged into every `mage-os/mirror-*` repository
(eg: https://github.com/mage-os/mirror-magento2).  
In case it’s not, go to [mage-os/infrastructure](http://github.com/mage-os/infrastructure)
and run [Sync magento/ org upstream repositories into mirrors for mage-os distribution](https://github.com/mage-os/infrastructure/actions/workflows/sync-upstream-magento.yml)
action (check branch `main` when running it).

### 1. magento2-base-composer-json

- Fork and clone https://github.com/mage-os/magento2-base-composer-json,
  then create a new branch that you'll use to create a pull request. 
- Run the `add-release.sh` script for every release, eg:
  ```sh
  ./add-release.sh 2.4.7-p4
  ./add-release.sh 2.4.6-p9
  ./add-release.sh 2.4.5-p11
  ./add-release.sh 2.4.4-p12
  ```
- Add, commit and push all the newly created files.

For a practical example [check this PR](https://github.com/mage-os/magento2-base-composer-json/pull/7).

### 2. github-actions

- Fork and clone https://github.com/mage-os/github-actions,
  then create a new branch that you'll use to create a pull request.
- Update the supported versions matrix editing
  [src/versions/magento-open-source/individual.json](https://github.com/mage-os/github-actions/blob/main/supported-version/src/versions/magento-open-source/individual.json).  
  Remember that, when inserting a new version like 2.4.6-p9, you´ll have to change the _end of life_
  date of the previous version (2.4.6-p8) to _one day earlier_ of the release date of the next version.
  [Check this example commit](https://github.com/mage-os/github-actions/pull/262/files#diff-0655b3d6263a5375945b0a6bbab191703f8ee83f9535a48e2871d8afec4cb2fc)
  and this screenshot to better understand what needs to be done:  
  <img width=500 src="https://github.com/user-attachments/assets/2860e539-e76e-4c8f-89c6-a8c4f1331778" />
- Check if `magento-open-source/composite.json` needs updating
  (it only happens when a new "non patch" release is published, like 2.4.8).
- Now "build" the project with
  - In the root of the project: `npm install`
  - In the supported-version folder: `npm run build`
- Edit `src/kind/get-currently-supported.spec.ts`
- Run `npm run test` and make sure that all tests are green.
- Commit, push and open a PR on mage-os/github-actions.

For a practical example [check this PR](https://github.com/mage-os/github-actions/pull/262).

### 3. generate-mirror-repo-js

- Fork and clone https://github.com/mage-os/generate-mirror-repo-js,
  then create a new branch that you'll use to create a pull request.
- Install latest magento version with  
  `composer create-project --repository-url=https://repo.magento.com/ magento/project-community-edition`
- "Build" the mirror with  
  `rm -rf repositories; node src/make/mirror.js --outputDir=build`
- Download all missing packages with  
  `./bin/download-missing-packages-from-repo-magento-com.php project-community-edition/composer.lock build resource/additional-packages`
- Commit and push the new files in `resource/additional-packages`.
- Copy all the `composer.json` files for all releases with something like
  ```sh
  cp ../mageos-magento2-base-composer-json/2.4.7-p4/magento2-base/composer.json resource/history/magento/magento2-base/2.4.7-p4.json
  cp ../mageos-magento2-base-composer-json/2.4.7-p4/product-community-edition/composer.json resource/history/magento/product-community-edition/2.4.7-p4.json
  cp ../mageos-magento2-base-composer-json/2.4.7-p4/project-community-edition/composer.json resource/history/magento/project-community-edition/2.4.7-p4.json
  ```
- Commit and push all the `composer.json` files.

When creating the PR on `generate-mirror-repo-js`, in order for all the checks to run,
the PR will have to be merged on a development branch.
Then go to the _actions_ for this repo:  and run the
[build, deploy & check mirror](https://github.com/mage-os/generate-mirror-repo-js/actions/workflows/build-upstream-mirror.yml)
selecting the new dev branch and the rest of the parameters as shown in this image:  
<img width="323" src="https://github.com/user-attachments/assets/31eb1eaf-5c2a-4d0b-8475-9e9f7c9239a8" />

For a practical example [check this PR](https://github.com/mage-os/generate-mirror-repo-js/pull/191)
and [this second one to merge the temporary dev branch into `main`](https://github.com/mage-os/generate-mirror-repo-js/pull/194).

## Process of building a new Mage-OS release

When deciding on a new version number for a Mage-OS release, 
see [our version numbering RFC](https://github.com/mage-os/mageos-magento2/issues/138#event-18190625013).

### 0. Preliminary check

First we need to make sure that all `mageos-` have been updated with latest changes from upstream, we can force the updates with:

- Go to this link:  https://github.com/orgs/mage-os/repositories?q=fork%3Atrue+archived%3Afalse+mageos-
- Click on every repository and, for every repository
- Click the "Actions" tab
- Run the merge-upstream-changes action

Then, for every repo, we have to merge every development branch into our `release/1.x`.  
At the moment we don't have an automated process to do that, but you can check https://github.com/mage-os/github-actions/pull/284 in order to generate the list of commands to do that.  
Note that, after creating all the PRs for every repo, if they don't have any conflicts, they should be merged as they are. But in case they have conflicts, then you should close the PR and manually re-create it via a forked repository in your personal account.

### 1. github-actions

- Fork and clone https://github.com/mage-os/github-actions,
  then create a new branch that you'll use to create a pull request.
- Update the supported versions matrix editing
  [src/versions/mage-os/individual.json](https://github.com/mage-os/github-actions/blob/main/supported-version/src/versions/mage-os/individual.json).  
  Remember that, when inserting a new version like 1.0.6, you´ll have to change the _end of life_
  date of the previous version (1.0.5) to _one day earlier_ of the release date of the next version.
  [Check this example commit](https://github.com/mage-os/github-actions/pull/263/commits/79c0bf654462288ccff7aae572b3a24e89e3256b)
- Check if `mage-os/composite.json` needs updating.
- Now "build" the project with
  - In the root of the project: `npm install`
  - In the supported-version folder: `npm run build`
- Edit `src/kind/get-currently-supported.spec.ts`
- Run `npm run test` and make sure that all tests are green.
- Commit, push and open a PR on mage-os/github-actions.

For a practical example [check this PR](https://github.com/mage-os/github-actions/pull/263).

### 2. Generate a test release

Execute the [Build, deploy & check Release](https://github.com/mage-os/generate-mirror-repo-js/actions/workflows/build-mageos-release.yml)
on the [generate-mirror-repo-js](https://github.com/mage-os/generate-mirror-repo-js), use these parameters as reference:

<img width="309" src="https://github.com/user-attachments/assets/34e2d5cf-175b-4f7a-98c4-26d2fc460e9e" />

**Important**:
- select the "preview" URL/folder in the first two combobox
- fill the version numbers and **do not** check the "push new release tag to repos"

After the workflow has finished, you can go https://preview-repo.mage-os.org and check that everything is ok, you should also
install the newly generated version with `composer create-project --repository-url=https://preview-repo.mage-os.org/ mage-os/project-community-edition`
and check that everything is ok before tagging the official release.


### 3. Generate the official release

Execute the [Build, deploy & check Release](https://github.com/mage-os/generate-mirror-repo-js/actions/workflows/build-mageos-release.yml)
on the [generate-mirror-repo-js](https://github.com/mage-os/generate-mirror-repo-js), use these parameters as reference:

<img width="310" src="https://github.com/user-attachments/assets/e6ae22f7-ad77-4017-a9ac-74224e14b82b" />

**Important**:
- select the production URL/folder in the first two combobox (the ones without the "preview" prefix)
- fill the version numbers and check the "push new release tag to repos"

After the workflow has finished, you can go https://repo.mage-os.org and check that everything is ok, you should also
install the newly generated version with `composer create-project --repository-url=https://repo.mage-os.org/ mage-os/project-community-edition`
before announcing the release.

### 3. Update generate-mirror-repo-js

- Fork and clone https://github.com/mage-os/generate-mirror-repo-js,
  then create a new branch that you'll use to create a pull request.
- Create `resource/history/mage-os/product-community-edition/VERSIONNUMBER.js` and `resource/history/mage-os/project-community-edition/VERSIONNUMBER.js`
  simply copying the previous ones and updating the numbering inside. Also, check
  [product-community-edition/dependencies-template.json](https://github.com/mage-os/generate-mirror-repo-js/blob/main/resource/composer-templates/mage-os/product-community-edition/dependencies-template.json)
  and [project-community-edition/dependencies-template.json](https://github.com/mage-os/generate-mirror-repo-js/blob/main/resource/composer-templates/mage-os/project-community-edition/dependencies-template.json)
  in case there are new lines that should also be added.
- Install the newly released version with `composer create-project --repository-url=https://repo.mage-os.org/ mage-os/project-community-edition`
- Create `resource/history/mage-os/magento2-base/VERSIONNUMBER.js` copying the base composer.json file
  (from `project-community-edition/vendor/mage-os/magento2-base/composer.json` folder).
- Create a PR with only the thre json files [like this one](https://github.com/mage-os/generate-mirror-repo-js/pull/196).

### 4. Announce the release

- Go to https://github.com/mage-os/mageos-magento2/tags and open the new tag
- Click 'Create release from tag' to create a GitHub release
- Update the release info based on the Mage-OS pull requests and contributors ([see an example](https://github.com/mage-os/mageos-magento2/releases/tag/1.0.5))
- Create a Wordpress update post on mage-os.org, based on [an existing release post](https://mage-os.org/releases/release-mage-os-distribution-1-0-5/), with the new release info incorporated.
- Share the new release info on Discord #announcements and LinkedIn.

## Copyright 2022 Vinai Kopp, Mage-OS

Distributed under the terms of the 3-Clause BSD Licence.
See the [LICENSE](LICENSE) file for more details.
