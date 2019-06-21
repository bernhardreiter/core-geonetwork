/*
 * Copyright (C) 2001-2016 Food and Agriculture Organization of the
 * United Nations (FAO-UN), United Nations World Food Programme (WFP)
 * and United Nations Environment Programme (UNEP)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301, USA
 *
 * Contact: Jeroen Ticheler - FAO - Viale delle Terme di Caracalla 2,
 * Rome - Italy. email: geonetwork@osgeo.org
 */

(function() {
  goog.provide('gn_mdview_service');

  var module = angular.module('gn_mdview_service', [
  ]);

  module.value('gnMdViewObj', {
    previousRecords: [],
    current: {
      record: null,
      index: null
    }
  });

  module.service('gnMdView', [
    'gnSearchLocation',
    '$rootScope',
    'gnMdFormatter',
    'Metadata',
    'gnMdViewObj',
    'gnSearchManagerService',
    'gnSearchSettings',
    'gnUrlUtils',
    'gnUtilityService', '$http',
    function(gnSearchLocation, $rootScope, gnMdFormatter, Metadata,
             gnMdViewObj, gnSearchManagerService, gnSearchSettings,
             gnUrlUtils, gnUtilityService, $http) {

      // Keep where the metadataview come from to get back on close
      var initFromConfig = function() {
        if (!gnSearchLocation.isMdView()) {
          gnMdViewObj.from = gnSearchLocation.path();
        }
      };
      $rootScope.$on('$locationChangeStart', initFromConfig);
      initFromConfig();

      this.feedMd = function(index, md, records) {
        gnMdViewObj.loadDetailsFinished = true;
        gnMdViewObj.records = records || gnMdViewObj.records;
        if (angular.isUndefined(md)) {
          md = gnMdViewObj.records[index];
        }

        // Set the route
        this.setLocationUuid(md.uuid);
        gnUtilityService.scrollTo();

        angular.extend(md, {
          links: md.getLinksByType('LINK'),
          downloads: md.getLinksByType('DOWNLOAD'),
          layers: md.getLinksByType('OGC', 'kml'),
          overviews: md.getThumbnails() ? md.getThumbnails().list : undefined
        });

        gnMdViewObj.current.record = md;
        gnMdViewObj.current.index = index;

        // TODO: do not add duplicates
        gnMdViewObj.previousRecords.push(md);

      };

      /**
       * Update location to be /metadata/uuid.
       * Remove the search path and attributes from location too.
       * @param {string} uuid
       */
      this.setLocationUuid = function(uuid) {
        gnSearchLocation.setUuid(uuid);
      };

      // The service needs to keep a reference to the metadata item scope
      var currentMdScope;
      this.setCurrentMdScope = function(scope) {
        currentMdScope = scope;
      };
      this.getCurrentMdScope = function() {
        return currentMdScope;
      };

      /**
       * Called when you want to pass from mdview uuid url back to search.
       * It change path back to search and inject the last parameters saved
       * at last search.
       */
      this.removeLocationUuid = function() {
        if (gnMdViewObj.from && gnMdViewObj.from != gnSearchLocation.SEARCH) {
          gnSearchLocation.path(gnMdViewObj.from);
        }
        else {
          gnSearchLocation.restoreSearch();
        }
      };

      /**
       * Init the mdview behavior linked on $location.
       * At start and $location change, the uuid is extracted
       * from the url and the md is loaded. If the md was already loaded
       * by a previous search, we use this object, otherwise we launch
       * a new search to retrieve this md.
       */
      this.initMdView = function() {
        var that = this;
        var loadMdView = function(event, newUrl, oldUrl) {
          gnMdViewObj.loadDetailsFinished = false;
          var uuid = gnSearchLocation.getUuid();
          if (uuid) {
            if (!gnMdViewObj.current.record ||
                gnMdViewObj.current.record.uuid !== uuid ||
                newUrl !== oldUrl) {

              //Check if we want the draft version
              var getDraft = window.location.hash.indexOf("/metadraf/") > 0;
              var foundMd = false;

              // Check if the md is in current search
              if (angular.isArray(gnMdViewObj.records)
                        && !getDraft) {
                for (var i = 0; i < gnMdViewObj.records.length; i++) {
                  var md = gnMdViewObj.records[i];
                  if (md.uuid === uuid) {
                    foundMd = true;
                    that.feedMd(i, md, gnMdViewObj.records);
                  }
                }
              }

              if (!foundMd){
                  // get a new search to pick the md
                  gnMdViewObj.current.record = null;
                $http.post('../api/search/records/_search', {"query": {
                    "bool" : {
                      "must": [
                        {"multi_match": {
                            "query": uuid,
                            "fields": ['id', 'uuid']}},
                        {"terms": {"isTemplate": ["n", "y"]}},
                        {"terms": {"draft": ["n", "y", "e"]}}
                        ]
                    }
                  }}).then(function(r) {
                    if (r.data.hits.total.value > 0) {
                      //If trying to show a draft that is not a draft, correct url:
                      if(r.data.hits.total.value == 1 &&
                          window.location.hash.indexOf("/metadraf/") > 0) {
                        window.location.hash = 
                          window.location.hash.replace("/metadraf/", "/metadata/");
                        //Now the location change event handles this
                        return;
                      }
                      
                      //If returned more than one, maybe we are looking for the draft
                      var i = 0;
                      r.data.hits.hits.forEach(function (md, index) {
                        if(getDraft
                            && md._source.draft == 'y') {
                          //This will only happen if the draft exists
                          //and the user can see it
                          i = index;
                        }
                      });
                      
                      var metadata = [];
                      metadata.push(new Metadata(r.data.hits.hits[i]));
                      data = {metadata: metadata};

                      //Keep the search results (gnMdViewObj.records)
                      // that.feedMd(0, undefined, data.metadata);
                      //and the trace of where in the search result we are
                      // TODOES: Review
                      that.feedMd(gnMdViewObj.current.index, 
                          data.metadata[i], gnMdViewObj.records);
                    } else {
                      gnMdViewObj.loadDetailsFinished = true;
                    }
                  }, function(error) {
                    gnMdViewObj.loadDetailsFinished = true;
                  });
              }
            } else {
              gnMdViewObj.loadDetailsFinished = true;
            }
          }
          else {
            gnMdViewObj.loadDetailsFinished = true;
            gnMdViewObj.current.record = null;
          }
        };
        
        loadMdView(); 
        // To manage uuid on page loading
        $rootScope.$on('$locationChangeSuccess', loadMdView);
      };

      this.initFormatter = function(selector) {
        var $this = this;
        var loadFormatter = function() {
          var uuid = gnSearchLocation.uuid;
          if (uuid) {
            gnMdFormatter.load(uuid,
                selector, $this.getCurrentMdScope());
          }
        };
        loadFormatter();
        $rootScope.$on('$locationChangeSuccess', loadFormatter);
      };

      /**
       * Open a metadata just from info in the layer. If the metadata comes
       * from the catalog, then the layer 'md' property contains the gn md
       * object. If not, we search the md in the catalog to open it.
       * @param {ol.layer} layer
       */
      this.openMdFromLayer = function(layer) {
        var md = layer.get('md');
        if (!md && layer.get('metadataUrl')) {

          var mdUrl = gnUrlUtils.urlResolve(layer.get('metadataUrl'));
          if (mdUrl.host == gnSearchLocation.host()) {
            gnSearchLocation.setUuid(layer.get('metadataUuid'));
          } else {
            window.open(layer.get('metadataUrl'), '_blank');
          }
        }
        else {
          this.feedMd(0, md, [md]);
        }
      };
    }
  ]);

  module.service('gnMdFormatter', [
    '$rootScope',
    '$http',
    '$compile',
    '$sce',
    'gnAlertService',
    'gnSearchSettings',
    '$q',
    'gnMetadataManager',
    function($rootScope, $http, $compile, $sce, gnAlertService,
             gnSearchSettings, $q, gnMetadataManager) {


      this.getFormatterUrl = function(fUrl, scope, uuid, opt_url) {
        var url;
        var promiseMd;
        if (scope && scope.md) {
          var deferMd = $q.defer();
          deferMd.resolve(scope.md);
          promiseMd = deferMd.promise;
        }
        else {
          promiseMd = gnMetadataManager.getMdObjByUuid(uuid);
        }

        return promiseMd.then(function(md) {
          if (angular.isString(fUrl)) {
            url = fUrl.replace('{{uuid}}', md.uuid);
          }
          else if (angular.isFunction(fUrl)) {
            url = fUrl(md);
          }

          // Attach the md to the grid element scope
          if (!scope.md) {
            scope.$parent.md = md;
            scope.md = md;
          }
          return url;
        });
      };

      this.load = function(uuid, selector, scope, opt_url) {
        $rootScope.$broadcast('mdLoadingStart');
        var newscope = scope ? scope.$new() :
            angular.element($(selector)).scope().$new();

        this.getFormatterUrl(opt_url || gnSearchSettings.formatter.defaultUrl,
            newscope, uuid, opt_url).then(function(url) {
          $http.get(url, {
            headers: {
              Accept: 'text/html'
            }
          }).then(function(response) {
            $rootScope.$broadcast('mdLoadingEnd');

            var newscope = scope ? scope.$new() :
                angular.element($(selector)).scope().$new();

            newscope.fragment =
                $compile(angular.element(response.data))(newscope);

            var el = document.createElement('div');
            el.setAttribute('gn-metadata-display', '');
            $(selector).append(el);
            $compile(el)(newscope);
          }, function() {
            $rootScope.$broadcast('mdLoadingEnd');
            gnAlertService.addAlert({
              msg: 'Erreur de chargement de la métadonnée.',
              type: 'danger'
            });
          });
        });
      };
    }
  ]);

})();
