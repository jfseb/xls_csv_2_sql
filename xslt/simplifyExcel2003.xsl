<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:ex="urn:schemas-microsoft-com:office:spreadsheet"
	xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:msxsl="urn:schemas-microsoft-com:xslt"
	exclude-result-prefixes="msxsl ex xsl">
	<xsl:output method="xml" omit-xml-declaration="yes"
        encoding="utf-8" indent="yes" />
	<!--  this template simplifies an 
	Excel 2003 xml spreadsheet. 
	
	It only keeps main information, 
	removes e.g. formatting within cells. 
 -->
	<!-- ******* Default copying ********  -->

	<xsl:template match="ex:Workbook">
		<xsl:copy>
			<xsl:copy-of select="@*" />
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>

	<xsl:template match="ex:Worksheet">
		<xsl:copy>
			<xsl:if test="@ss:Name">
				<xsl:attribute name="Name">
					<xsl:value-of select="@ss:Name"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>
	<xsl:template match="ex:Table">
		<xsl:copy>
			<xsl:copy-of select="@ss:ExpandedColumnCount" />
			<xsl:copy-of select="@ss:ExpandedRowCount" />
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>

	<xsl:template match="ex:Row">
		<xsl:copy>
			<xsl:if test="@ex:Index">
				<xsl:attribute name="Index">
					<xsl:value-of select="@ex:Index"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>

	<xsl:template match="ex:Cell">
		<xsl:copy>
			<xsl:if test="@ex:Index">
				<xsl:attribute name="Index">
					<xsl:value-of select="@ex:Index"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:if test="@ex:MergeAcross">
				<xsl:attribute name="MergeAcross">
					<xsl:value-of select="@ex:MergeAcross"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:if test="@ex:MergeDown">
				<xsl:attribute name="MergeDown">
					<xsl:value-of select="@ex:MergeDown"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:attribute name="type">
				<xsl:value-of select="ex:Data/@ss:Type"/>
			</xsl:attribute>
			<xsl:attribute name="content">
				<xsl:value-of select="ex:Data/text()"/>
			</xsl:attribute>
<!--			<xsl:apply-templates/>-->
		</xsl:copy>
	</xsl:template>

	<xsl:template match="ex:Data">	
		<xsl:value-of select="text()"/>
	</xsl:template>

	<xsl:template match="/">
		<xsl:apply-templates select="//ex:Workbook"/>
	</xsl:template>
	<!--
	<xsl:template match="/">
		<xsl:copy>
			<xsl:copy-of select="@*" />
			<xsl:apply-templates/>
		</xsl:copy>
	</xsl:template>
	-->
	<xsl:template match="text()">
		<!--<xsl:copy-of select="." />-->
	</xsl:template>
	<xsl:template match="comment()">
		<xsl:copy-of select="." />
	</xsl:template>
</xsl:stylesheet>
