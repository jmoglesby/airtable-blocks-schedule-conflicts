import React from 'react';
import styled from 'styled-components';
import { Heading, Text, Box, expandRecord } from '@airtable/blocks/ui';

const StyledBox = styled.div`
  padding: 4px;
  margin-bottom: 6px;
  border-radius: 5px;

  :hover {
    cursor: pointer;
    background-color: hsla(0, 0%, 0%, 0.035);
  }
`;

function PersonNameLink(props) {
  return (
    <StyledBox onClick={() => expandRecord(props.person)}>
      <Heading marginBottom={-1}>{props.person.getCellValue("Name")}</Heading>
      <Text textColor="light" fontWeight={300} paddingLeft={3}>conflicts:</Text>
    </StyledBox>
  );
}

export default PersonNameLink;
