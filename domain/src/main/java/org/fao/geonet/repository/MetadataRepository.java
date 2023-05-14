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

package org.fao.geonet.repository;

import java.util.List;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

import org.fao.geonet.domain.Metadata;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Data Access object for the {@link Metadata} entities.
 *
 * The use of this class is discouraged, you should use IMetadataUtils or IMetadataManager instead.
 *
 * @author Jesse
 */
public interface MetadataRepository extends GeonetRepository<Metadata, Integer>, MetadataRepositoryCustom,
    JpaSpecificationExecutor<Metadata>, StreamableJpaSpecificationRepository<Metadata> {

    @Nullable
    Metadata findOneById(int id);

    /**
     * Find one metadata by the metadata's uuid.
     *
     * @param uuid the uuid of the metadata to find
     * @return one metadata or null.
     */
    @Nullable
    Metadata findOneByUuid(@Nonnull String uuid);


    /**
     * Find all metadata by the metadata's uuid.
    *
    * @param uuid the uuid of the metadata to find
    * @return a list of metadata.
    */
   @Nullable
   List<Metadata> findAllByUuid(@Nonnull String uuid);

    /**
     * Find all metadata harvested by the identified harvester.
     *
     * @param uuid the uuid of the harvester
     * @return all metadata harvested by the identified harvester.
     */
    @Nonnull
    List<Metadata> findAllByHarvestInfo_Uuid(@Nonnull String uuid);



    @Query(value = "SELECT replace(data, :search, :replace) FROM metadata m " +
        "WHERE uuid = :uuid",
        nativeQuery = true)
    String selectOneWithSearchAndReplace(
        @Param("uuid") String uuid,
        @Param("search") String search,
        @Param("replace") String replace);

    @Query(value = "SELECT regexp_replace(data, :pattern, :replace) FROM metadata m " +
        "WHERE uuid = :uuid",
        nativeQuery = true)
    String selectOneWithRegexSearchAndReplace(
        @Param("uuid") String uuid,
        @Param("pattern") String search,
        @Param("replace") String replace);

    @Query(value = "SELECT regexp_replace(data, :pattern, :replace, :flags) FROM metadata m " +
        "WHERE uuid = :uuid",
        nativeQuery = true)
    String selectOneWithRegexSearchAndReplaceWithFlags(
        @Param("uuid") String uuid,
        @Param("pattern") String search,
        @Param("replace") String replace,
        @Param("flags") String flags);

    /**
     * Find all metadata harvested by the identified harvester.
     *
     * @param uuid the uuid of the harvester
     * @return all metadata harvested by the identified harvester.
     */
    @Nonnull
    List<Metadata> findAllByHarvestInfo_Uuid(@Nonnull String uuid, Pageable p);
}
