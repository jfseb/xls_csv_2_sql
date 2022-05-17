<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
	<xsl:output omit-xml-declaration="no"/>
	<xsl:template match="/">
		<!-- <?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?> -->
		<xsl:processing-instruction name="mso-application">progid="Excel.Sheet"</xsl:processing-instruction>
		<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
			xmlns:o="urn:schemas-microsoft-com:office:office"
			xmlns:x="urn:schemas-microsoft-com:office:excel"
			xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882"
			xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
			xmlns:html="http://www.w3.org/TR/REC-html40">
			<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
				<Styles>
					<Style ss:ID="header" ss:Name="Normal">
						<Font ss:FontName="Verdana" ss:Bold="1" />
					</Style>
				</Styles>
				<Author>
					<xsl:value-of select="/wb/Author"></xsl:value-of>
				</Author>
				<LastAuthor>
					<xsl:value-of select="/wb/Author"></xsl:value-of>
				</LastAuthor>
				<TotalTime>0</TotalTime>
				<Created>2022-01-12T19:51:16Z</Created>
				<LastSaved>2022-01-16T15:08:29Z</LastSaved>
				<Company></Company>
				<Version>16.00</Version>
			</DocumentProperties>
			<CustomDocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
				<IbpWorkbookKeyString_GUID dt:dt="string">31d33f33-fa8c-4d4c-90c2-ce25264a6083</IbpWorkbookKeyString_GUID>
				<ContentTypeId dt:dt="string">0x010100A23868978E42BE48AE266BBD469E078F</ContentTypeId>
			</CustomDocumentProperties>
			<OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office">
				<AllowPNG/>
			</OfficeDocumentSettings>
			<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
				<WindowHeight>7680</WindowHeight>
				<WindowWidth>24360</WindowWidth>
				<WindowTopX>32767</WindowTopX>
				<WindowTopY>32767</WindowTopY>
				<ActiveSheet>1</ActiveSheet>
				<ProtectStructure>False</ProtectStructure>
				<ProtectWindows>False</ProtectWindows>
			</ExcelWorkbook>
			<Styles>
				<Style ss:ID="Default" ss:Name="Normal">
					<Alignment ss:Vertical="Bottom"/>
					<Borders/>
					<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
					<Interior/>
					<NumberFormat/>
					<Protection/>
				</Style>
				<Style ss:ID="s62">
					<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
					<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>
					<Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/>
				</Style>
				<Style ss:ID="s63">
					<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>
				</Style>
				<Style ss:ID="s64">
					<Alignment ss:Horizontal="Right" ss:Vertical="Bottom"/>
				</Style>
			</Styles>
			<xsl:for-each select="/wb/sheets/ws">
				<xsl:variable name="ws" select="."/>
				<Worksheet ss:NameX="DC04">
					<xsl:attribute name="ss:Name">
						<xsl:value-of select="wsname"/>
					</xsl:attribute>
					<Names>
						<NamedRange ss:Name="_FilterDatabase" ss:RefersTo="=WS_NR_3_FIRST!R1C1:R1C3" ss:Hidden="1">
							<xsl:attribute name="ss:RefersTo">
								<xsl:value-of select="concat('=',wsname,'!R1C1:R1C',mincols)"/>
							</xsl:attribute>
						</NamedRange>
					</Names>
					<!-- <Table ss:ExpandedColumnCount="9" ss:ExpandedRowCount="14" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="51.428571428571431" ss:DefaultRowHeight="14.464285714285715"> -->
					<Table ss:ExpandedColumnCount="9" ss:ExpandedRowCount="14" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="14.464285714285715">
						<xsl:attribute name="ss:ExpandedColumnCount">
							<xsl:value-of select="maxcols"/>
						</xsl:attribute>
						<xsl:attribute name="ss:ExpandedRowCount">
							<xsl:value-of select="nrrows"/>
						</xsl:attribute>
						<xsl:for-each select="tdata[1]/row">
							<Column ss:AutoFitWidth="1" />
						</xsl:for-each>
						<!--
		<Column ss:AutoFitWidth="0" ss:Width="182.14285714285714"/>


			 <Column ss:AutoFitWidth="0" ss:Width="238.71428571428572"/>
			 <Column ss:AutoFitWidth="0" ss:Width="219.42857142857142"/>
			 <Column ss:AutoFitWidth="0" ss:Width="63.428571428571431"/>
			 <Column ss:AutoFitWidth="0" ss:Width="225.85714285714286" ss:Span="1"/>
			 <Column ss:Index="7" ss:AutoFitWidth="0" ss:Width="154.28571428571428"/>
				 -->
				 	<xsl:choose>
						 <xsl:when test="count(tdata) &gt; 1000">
				 			<DataPlaceHolder>
								 <xsl:attribute name="for"><xsl:value-of select="wsname"/></xsl:attribute>
							 </DataPlaceHolder>
						</xsl:when>
						<xsl:otherwise>
						<xsl:for-each select="tdata">
							<xsl:choose>
								<xsl:when test="position()=1">
									<Row ss:AutoFitHeight="0">
										<xsl:for-each select="row">
											<Cell ss:StyleID="s62">
												<Data ss:Type="String">
													<xsl:value-of select="."/>
												</Data>
												<NamedCell ss:Name="_FilterDatabase"/>
											</Cell>
										</xsl:for-each>
										<!--
	 <Cell ss:StyleID="s62"><Data ss:Type="String">SERVERCOL</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DB_NAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DB_KIND</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DBCOL</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">TNAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CNAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CID</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CCOL</Data></Cell>
		-->
									</Row>
								</xsl:when>
								<xsl:otherwise>
									<Row ss:AutoFitHeight="0">
										<xsl:for-each select="row">
											<xsl:variable name="pos" select="position()"/>
											<xsl:choose>
												<xsl:when test="$ws/dtypes[$pos] = 'varchar'">
													<Cell ss:StyleID="s63">
														<Data ss:Type="String">
															<xsl:value-of select="."/>
														</Data>
													</Cell>
												</xsl:when>
												<xsl:when test="$ws/dtypes[$pos] = 'nvarchar'">
												<Cell ss:StyleID="s63">
													<Data ss:Type="String">
														<xsl:value-of select="."/>
													</Data>
												</Cell>
												</xsl:when>
												<xsl:when test="$ws/dtypes[$pos] = 'int' and text() = 'NULL'">
													<Cell ss:StyleID="s64">
														<Data ss:Type="String">
															<xsl:value-of select="."/>
														</Data>
													</Cell>
												</xsl:when>
												<xsl:when test="$ws/dtypes[$pos] = 'bigint' and text() = 'NULL'">
												<Cell ss:StyleID="s64">
													<Data ss:Type="String">
														<xsl:value-of select="."/>
													</Data>
												</Cell>
												</xsl:when>
												<xsl:when test="$ws/dtypes[$pos] = 'int'">
													<Cell>
														<Data ss:Type="Number">
															<xsl:value-of select="."/>
														</Data>
													</Cell>
												</xsl:when>
												<xsl:when test="$ws/dtypes[$pos] = 'bigint'">
													<Cell>
														<Data ss:Type="Number">
															<xsl:value-of select="."/>
														</Data>
													</Cell>
												</xsl:when>
												<xsl:otherwise>
													<Cell ss:StyleID="s63">
														<Data ss:Type="String">UNKNOWN TYPE !  <xsl:value-of select="$ws/dtypes[$pos]"/>
 :														<xsl:value-of select="."/>
													</Data>
												</Cell>
											</xsl:otherwise>
										</xsl:choose>
									</xsl:for-each>
									<!--
	 <Cell ss:StyleID="s62"><Data ss:Type="String">SERVERCOL</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DB_NAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DB_KIND</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">DBCOL</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">TNAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CNAME</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CID</Data></Cell>
	 <Cell ss:StyleID="s62"><Data ss:Type="String">CCOL</Data></Cell>
		-->
								</Row>
							</xsl:otherwise>
						</xsl:choose>
					</xsl:for-each>
				</xsl:otherwise>
			</xsl:choose>
				</Table>
				<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
					<PageSetup>
						<Header x:Margin="0.3"/>
						<Footer x:Margin="0.3"/>
						<PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
					</PageSetup>
					<Unsynced/>
					<Print>
						<ValidPrinterInfo/>
						<HorizontalResolution>600</HorizontalResolution>
						<VerticalResolution>600</VerticalResolution>
					  </Print>
					<xsl:if test="position() = 1">
						<Selected/>
					</xsl:if>
					<xsl:choose>

						<xsl:when test="(xlscontext/WSFIX[2] &gt; '0') and (xlscontext/WSFIX[1] &gt; 0)">
							<FreezePanes/>
							<FrozenNoSplit/>
							<SplitHorizontal>
								<xsl:value-of select="xlscontext/WSFIX[1]"/>
							</SplitHorizontal>
							<TopRowBottomPane>
								<xsl:value-of select="xlscontext/WSFIX[1]"/>
							</TopRowBottomPane>
							<SplitVertical>
								<xsl:value-of select="xlscontext/WSFIX[2]"/>
							</SplitVertical>
							<LeftColumnRightPane>
								<xsl:value-of select="xlscontext/WSFIX[2]"/>
							</LeftColumnRightPane>
							<ActivePane>0</ActivePane>
							<Panes>
								<Pane>
									<Number>3</Number>
								</Pane>
								<Pane>
									<Number>1</Number>
								</Pane>
								<Pane>
									<Number>2</Number>
								</Pane>
								<Pane>
									<Number>0</Number>
								</Pane>
							</Panes>
						</xsl:when>
						<xsl:otherwise>
							<Panes>
								<Pane>
									<Number>3</Number>
									<ActiveRow>1</ActiveRow>
									<ActiveCol>1</ActiveCol>
								</Pane>
							</Panes>
						</xsl:otherwise>
					</xsl:choose>
					<ProtectObjects>False</ProtectObjects>
					<ProtectScenarios>False</ProtectScenarios>
				</WorksheetOptions>
				<!-- titles -->
				<xsl:for-each select="colcomments">
					<xsl:if test="text() != ''">
						<DataValidation xmlns="urn:schemas-microsoft-com:office:excel">
							<Range>R1C<xsl:value-of select="position()"></xsl:value-of>
							</Range>
							<InputMessage>
								<xsl:value-of select="."/>
							</InputMessage>
						</DataValidation>
					</xsl:if>
				</xsl:for-each>
				<AutoFilter x:Range="R1C1:R1C3"
					xmlns="urn:schemas-microsoft-com:office:excel">
					<xsl:attribute name="x:Range">
						<xsl:value-of select="concat('R1C1:R', nrrows, 'C',mincols)"/>
					</xsl:attribute>
				</AutoFilter>
			</Worksheet>
		</xsl:for-each>
	</Workbook>
</xsl:template>
</xsl:stylesheet>