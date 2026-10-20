export interface StringTemplateObject {
  variables: Variable[]
  templateText: string
}

export interface Variable {
  variableName: string
  jsonPath: string
}

export interface StringTemplate {
  id: number
  templateName: string
  templateCode: string
  stringTemplateObject: StringTemplateObject
}

export interface CreateStringTemplateRO {
  templateName: string
  templateCode: string
  stringTemplateObject: StringTemplateObject
}

export interface UpdateStringTemplateRO {
  id: number
  templateName: string
  templateCode: string
  stringTemplateObject: StringTemplateObject
}
